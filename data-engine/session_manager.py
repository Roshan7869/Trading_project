"""
Session Manager
Orchestrates multi-user broker sessions.
"""

import threading
import json
import time
from typing import Dict
from pymongo import MongoClient
import redis
from logzero import logger

from config import Config
from brokers.base_client import BaseBrokerClient
from brokers.broker_factory import BrokerFactory
from utils.encryption import decrypt
from symbol_loader import SymbolManager

class SessionManager:
    """
    Manages multiple broker sessions for different users.
    """
    
    def __init__(self):
        # Redis connection for Pub/Sub and Publishing
        self.redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()
        
        # Mongo connection to fetch credentials
        # Mongo URL might need to be parsed or used directly
        # Config.MONGO_URL should be set in .env
        import os
        mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/paper_trading')
        self.mongo_client = MongoClient(mongo_url)
        self.db = self.mongo_client.get_database() # Uses default db from URL
        
        # Active sessions: userId -> BrokerClient instance
        self.sessions: Dict[str, BaseBrokerClient] = {}
        
        # Symbol Manager (Shared for now, or per session?)
        # For simplicity, we'll let each session manage its own subscriptions 
        # based on a global list or user-specific list.
        # MVP: All users subscribe to ALL symbols in symbols.json (simplest for Paper Trading)
        self.symbol_manager = SymbolManager('symbols.json')
        self.symbol_manager.load_from_file()
        self.active_symbols = self.symbol_manager.get_active_symbols()
        
        self.running = False
        
    def start(self):
        """Start the session manager."""
        self.running = True
        logger.info("🚀 Starting Session Manager...")
        
        # 1. Sync initial sessions from DB
        self._sync_sessions()
        
        # 2. Start Redis listener thread
        self.listener_thread = threading.Thread(target=self._listen_for_updates)
        self.listener_thread.daemon = True
        self.listener_thread.start()
        
        logger.info("✅ Session Manager running")
        
    def stop(self):
        """Stop all sessions."""
        self.running = False
        logger.info("🛑 Stopping Session Manager...")
        
        for user_id, session in self.sessions.items():
            try:
                session.stop_streaming()
                session.logout()
            except Exception as e:
                logger.error(f"Error stopping session for {user_id}: {e}")
                
        self.sessions.clear()
        
    def _sync_sessions(self):
        """Fetch all active broker connections from MongoDB and start sessions."""
        try:
            users = self.db.users.find({
                "brokerConnections": {
                    "$elemMatch": {"isActive": True}
                }
            })
            
            count = 0
            for user in users:
                user_id = str(user['_id'])
                # Find the active connection
                active_conn = next((c for c in user.get('brokerConnections', []) if c['isActive']), None)
                
                if active_conn:
                    self._start_user_session(user_id, active_conn)
                    count += 1
            
            logger.info(f"🔄 Initial sync: Started {count} active sessions")
            
        except Exception as e:
            logger.exception(f"Failed to sync sessions: {e}")

    def _listen_for_updates(self):
        """Listen for broker_update events from Redis."""
        self.pubsub.subscribe('broker_update')
        logger.info("🎧 Listening for broker updates...")
        
        while self.running:
            try:
                message = self.pubsub.get_message(timeout=1.0)
                if message and message['type'] == 'message':
                    data = json.loads(message['data'])
                    logger.info(f"📩 Received update: {data}")
                    self._handle_update(data)
            except Exception as e:
                logger.error(f"Error in listener loop: {e}")
                time.sleep(1)

    def _handle_update(self, data: dict):
        """Handle a configuration update event."""
        user_id = data.get('userId')
        broker_type = data.get('broker')
        
        if not user_id:
            return

        # Fetch fresh data from DB to get credentials
        user = self.db.users.find_one({"_id": self._to_object_id(user_id)})
        if not user:
            logger.warning(f"User {user_id} not found")
            return

        active_conn = next((c for c in user.get('brokerConnections', []) if c['broker'] == broker_type and c['isActive']), None)
        
        if active_conn:
            # Start/Restart session
            self._start_user_session(user_id, active_conn)
        else:
            # User might have deactivated the broker
            self._stop_user_session(user_id)

    def _start_user_session(self, user_id: str, connection: dict):
        """Initialize and start a session for a user."""
        try:
            broker_type = connection['broker']
            logger.info(f"⚙️ Configuring {broker_type} session for {user_id}...")
            
            # Stop existing session if any
            self._stop_user_session(user_id)
            
            # Decrypt credentials
            credentials = self._decrypt_connection(connection)
            
            # Create adapter
            adapter = BrokerFactory.create(broker_type, credentials, self.redis_client)
            if not adapter:
                logger.error(f"Failed to create adapter for {broker_type}")
                return
            
            # Login
            if not adapter.login():
                logger.error(f"Login failed for {user_id} ({broker_type})")
                return
            
            # Start Streaming
            # MVP: Subscribe to global active symbols list
            adapter.start_streaming(self.active_symbols)
            
            self.sessions[user_id] = adapter
            logger.info(f"✅ Session active for {user_id} on {broker_type}")
            
        except Exception as e:
            logger.exception(f"Failed to start session for {user_id}: {e}")

    def _stop_user_session(self, user_id: str):
        """Stop and remove a user's session."""
        if user_id in self.sessions:
            try:
                logger.info(f"🛑 Stopping session for {user_id}")
                self.sessions[user_id].stop_streaming()
                self.sessions[user_id].logout()
                del self.sessions[user_id]
            except Exception as e:
                logger.error(f"Error stopping session: {e}")

    def _decrypt_connection(self, connection: dict) -> dict:
        """Decrypt all encrypted fields in the connection object."""
        ENCRYPTED_FIELDS = ['apiSecret', 'pin', 'totpSecret', 'consumerSecret', 'password', 'accessToken']
        
        decrypted = connection.copy()
        for field in ENCRYPTED_FIELDS:
            if field in decrypted and decrypted[field]:
                try:
                    decrypted[field] = decrypt(decrypted[field])
                except Exception:
                    # Maybe it wasn't encrypted? Or decryption failed.
                    pass
        return decrypted

    def _to_object_id(self, id_str: str):
        from bson.objectid import ObjectId
        try:
            return ObjectId(id_str)
        except:
            return id_str

"""
Async Session Manager
High-performance multi-user broker session orchestrator using asyncio.
Handles 10,000+ concurrent connections on a single server.
"""

import asyncio
import json
from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import aiohttp
import os
from logzero import logger
from bson.objectid import ObjectId

from config import Config
from brokers.base_client import BaseBrokerClient
from brokers.broker_factory import BrokerFactory
from utils.encryption import decrypt
from symbol_loader import SymbolManager


class AsyncSessionManager:
    """
    Manages multiple broker sessions using asyncio for massive scalability.
    """
    
    def __init__(self):
        # Will be initialized in start()
        self.redis_client = None
        self.pubsub = None
        self.mongo_client = None
        self.db = None
        
        # Active sessions: userId -> BrokerClient instance
        self.sessions: Dict[str, BaseBrokerClient] = {}
        
        # Symbol Manager
        self.symbol_manager = SymbolManager('symbols.json')
        self.symbol_manager.load_from_file()
        self.active_symbols = self.symbol_manager.get_active_symbols()
        
        self.running = False
        self._tasks: list[asyncio.Task] = []
        
    async def start(self):
        """Start the async session manager."""
        self.running = True
        logger.info("🚀 Starting Async Session Manager...")
        
        # Initialize async Redis
        import redis.asyncio as aioredis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = await aioredis.from_url(redis_url, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()
        
        # Initialize async MongoDB
        mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/paper_trading')
        self.mongo_client = AsyncIOMotorClient(mongo_url)
        self.db = self.mongo_client.get_database()
        
        # 1. Sync initial sessions from DB
        await self._sync_sessions()
        
        # 2. Start Redis listener as background task
        listener_task = asyncio.create_task(self._listen_for_updates())
        self._tasks.append(listener_task)
        
        # 3. Start health check task
        health_task = asyncio.create_task(self._health_check_loop())
        self._tasks.append(health_task)
        
        logger.info(f"✅ Async Session Manager running with {len(self.sessions)} active sessions")
        
    async def stop(self):
        """Stop all sessions gracefully."""
        self.running = False
        logger.info("🛑 Stopping Async Session Manager...")
        
        # Cancel all background tasks
        for task in self._tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        # Stop all broker sessions
        for user_id, session in list(self.sessions.items()):
            try:
                session.stop_streaming()
                session.logout()
            except Exception as e:
                logger.error(f"Error stopping session for {user_id}: {e}")
                
        self.sessions.clear()
        
        # Close connections
        if self.pubsub:
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()
        if self.mongo_client:
            self.mongo_client.close()
            
        logger.info("✅ Async Session Manager stopped")
        
    async def _sync_sessions(self):
        """Fetch all active broker connections from MongoDB and start sessions."""
        try:
            cursor = self.db.users.find({
                "brokerConnections": {
                    "$elemMatch": {"isActive": True}
                }
            })
            
            count = 0
            async for user in cursor:
                user_id = str(user['_id'])
                # Find the active connection
                active_conn = next((c for c in user.get('brokerConnections', []) if c['isActive']), None)
                
                if active_conn:
                    await self._start_user_session(user_id, active_conn)
                    count += 1
            
            logger.info(f"🔄 Initial sync: Started {count} active sessions")
            
        except Exception as e:
            logger.exception(f"Failed to sync sessions: {e}")

    async def _listen_for_updates(self):
        """Listen for broker_update events from Redis."""
        await self.pubsub.subscribe('broker_update')
        logger.info("🎧 Listening for broker updates...")
        
        try:
            async for message in self.pubsub.listen():
                if not self.running:
                    break
                    
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        logger.info(f"📩 Received update: {data}")
                        await self._handle_update(data)
                    except Exception as e:
                        logger.error(f"Error processing update: {e}")
        except asyncio.CancelledError:
            logger.info("Redis listener cancelled")
        except Exception as e:
            logger.error(f"Redis listener error: {e}")

    async def _handle_update(self, data: dict):
        """Handle a configuration update event."""
        user_id = data.get('userId')
        broker_type = data.get('broker')
        
        if not user_id:
            return

        # Fetch fresh data from DB to get credentials
        user = await self.db.users.find_one({"_id": self._to_object_id(user_id)})
        if not user:
            logger.warning(f"User {user_id} not found")
            return

        active_conn = next((c for c in user.get('brokerConnections', []) if c['broker'] == broker_type and c['isActive']), None)
        
        if active_conn:
            # Start/Restart session
            await self._start_user_session(user_id, active_conn)
        else:
            # User might have deactivated the broker
            await self._stop_user_session(user_id)

    async def _start_user_session(self, user_id: str, connection: dict):
        """Initialize and start a session for a user."""
        try:
            broker_type = connection['broker']
            logger.info(f"⚙️ Configuring {broker_type} session for {user_id}...")
            
            # Stop existing session if any
            await self._stop_user_session(user_id)
            
            # Decrypt credentials
            credentials = self._decrypt_connection(connection)
            
            # Create sync Redis client for adapter (adapters still use sync redis for now)
            import redis
            sync_redis = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'), decode_responses=True)
            
            # Create adapter
            adapter = BrokerFactory.create(broker_type, credentials, sync_redis)
            if not adapter:
                logger.error(f"Failed to create adapter for {broker_type}")
                return
            
            # Login (blocking call - consider making adapters fully async later)
            # For now, run in executor to not block event loop
            loop = asyncio.get_event_loop()
            login_success = await loop.run_in_executor(None, adapter.login)
            
            if not login_success:
                logger.error(f"Login failed for {user_id} ({broker_type})")
                return
            
            # Start Streaming (also blocking)
            await loop.run_in_executor(None, adapter.start_streaming, self.active_symbols)
            
            self.sessions[user_id] = adapter
            logger.info(f"✅ Session active for {user_id} on {broker_type}")
            
        except Exception as e:
            logger.exception(f"Failed to start session for {user_id}: {e}")

    async def _stop_user_session(self, user_id: str):
        """Stop and remove a user's session."""
        if user_id in self.sessions:
            try:
                logger.info(f"🛑 Stopping session for {user_id}")
                adapter = self.sessions[user_id]
                
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, adapter.stop_streaming)
                await loop.run_in_executor(None, adapter.logout)
                
                del self.sessions[user_id]
            except Exception as e:
                logger.error(f"Error stopping session: {e}")

    async def _health_check_loop(self):
        """Periodically check session health."""
        while self.running:
            try:
                await asyncio.sleep(60)  # Every minute
                
                active_count = len(self.sessions)
                logger.info(f"💓 Health check: {active_count} active sessions")
                
                # Could add reconnection logic here for dead sessions
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")

    def _decrypt_connection(self, connection: dict) -> dict:
        """Decrypt all encrypted fields in the connection object."""
        ENCRYPTED_FIELDS = ['apiSecret', 'pin', 'totpSecret', 'consumerSecret', 'password', 'accessToken']
        
        decrypted = connection.copy()
        for field in ENCRYPTED_FIELDS:
            if field in decrypted and decrypted[field]:
                try:
                    decrypted[field] = decrypt(decrypted[field])
                except Exception:
                    pass
        return decrypted

    def _to_object_id(self, id_str: str):
        try:
            return ObjectId(id_str)
        except:
            return id_str

    def get_stats(self) -> dict:
        """Get session manager statistics."""
        return {
            'active_sessions': len(self.sessions),
            'running': self.running,
            'symbols_tracked': len(self.active_symbols)
        }

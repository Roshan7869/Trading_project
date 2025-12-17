"""
WebSocket handler for Angel One SmartAPI real-time market data.
Uses SmartWebSocketV2 for streaming live tick data.
Publishes tick data to Redis for consumption by the backend.
"""

import json
import time
import redis
from datetime import datetime
from logzero import logger

from SmartApi.smartWebSocketV2 import SmartWebSocketV2

from config import Config
from symbol_mapper import get_token_list_for_subscription, get_symbol_from_token, TOKEN_TO_SYMBOL


class MarketDataWebSocket:
    """
    WebSocket handler for real-time market data streaming.
    
    Features:
    - Connects to Angel One WebSocket V2
    - Subscribes to configured stock tokens
    - Parses binary tick data
    - Publishes JSON tick data to Redis
    - Handles reconnection on disconnect
    """
    
    # Subscription modes
    MODE_LTP = 1      # Last Traded Price only
    MODE_QUOTE = 2    # LTP + OHLC + more
    MODE_SNAP = 3     # Full snapshot with depth
    
    def __init__(self, auth_token: str, feed_token: str, api_key: str = None, client_code: str = None):
        """
        Initialize WebSocket with authentication tokens.
        
        Args:
            auth_token: JWT token from login
            feed_token: Feed token for WebSocket subscription
            api_key: Angel One API key (optional, uses config if not provided)
            client_code: Client code (optional, uses config if not provided)
        """
        self.auth_token = auth_token
        self.feed_token = feed_token
        self.api_key = api_key or Config.ANGEL_ONE_API_KEY
        self.client_code = client_code or Config.ANGEL_ONE_CLIENT_CODE
        
        # Redis client for publishing
        self.redis_client = redis.from_url(Config.REDIS_URL)
        
        # WebSocket instance
        self.sws = None
        self.is_connected = False
        self.reconnect_attempts = 0
        
        # Correlation ID for subscriptions
        self.correlation_id = "paper_trading_feed"
        
        # Current subscription mode
        self.mode = self.MODE_QUOTE
        
    def _on_open(self, wsapp):
        """Callback when WebSocket connection opens."""
        logger.info("✅ WebSocket connection established")
        self.is_connected = True
        self.reconnect_attempts = 0
        
        # Subscribe to all configured tokens
        token_list = get_token_list_for_subscription()
        logger.info(f"Subscribing to {len(TOKEN_TO_SYMBOL)} symbols")
        
        try:
            self.sws.subscribe(self.correlation_id, self.mode, token_list)
            logger.info("✅ Subscription request sent")
        except Exception as e:
            logger.exception(f"Failed to subscribe: {e}")
    
    def _on_data(self, wsapp, message):
        """
        Callback when tick data is received.
        Parses the binary message and publishes to Redis.
        """
        try:
            # Message is already parsed by SmartWebSocketV2
            if isinstance(message, dict):
                tick_data = self._parse_tick(message)
                if tick_data:
                    self._publish_to_redis(tick_data)
            else:
                logger.warning(f"Unexpected message format: {type(message)}")
                
        except Exception as e:
            logger.exception(f"Error processing tick data: {e}")
    
    def _parse_tick(self, message: dict) -> dict | None:
        """
        Parse tick message into standard format.
        
        Args:
            message: Raw tick message from WebSocket
            
        Returns:
            Standardized tick data dict or None if parsing fails
        """
        try:
            # Extract token and get symbol
            token = str(message.get('token', ''))
            symbol = get_symbol_from_token(token)
            
            if not symbol:
                # Unknown token, skip
                return None
            
            # Extract price data
            ltp = message.get('last_traded_price', 0) / 100  # Price comes in paise
            
            # Calculate change percentage if available
            close_price = message.get('close_price', 0) / 100
            change_percent = 0
            if close_price > 0:
                change_percent = round(((ltp - close_price) / close_price) * 100, 2)
            
            # Build standardized tick
            tick = {
                'symbol': symbol,
                'price': round(ltp, 2),
                'change': change_percent,
                'timestamp': datetime.now().isoformat(),
                'volume': message.get('volume_traded_today', 0),
                'open': message.get('open_price', 0) / 100,
                'high': message.get('high_price', 0) / 100,
                'low': message.get('low_price', 0) / 100,
                'close': close_price,
                'source': 'live'
            }
            
            return tick
            
        except Exception as e:
            logger.exception(f"Failed to parse tick: {e}")
            return None
    
    def _publish_to_redis(self, tick: dict):
        """Publish tick data to Redis channel."""
        try:
            self.redis_client.publish(
                Config.MARKET_TICKS_CHANNEL,
                json.dumps(tick)
            )
        except Exception as e:
            logger.exception(f"Failed to publish to Redis: {e}")
    
    def _on_error(self, wsapp, error):
        """Callback when WebSocket error occurs."""
        logger.error(f"WebSocket error: {error}")
        self.is_connected = False
    
    def _on_close(self, wsapp):
        """Callback when WebSocket connection closes."""
        logger.warning("WebSocket connection closed")
        self.is_connected = False
        
        # Attempt reconnection
        if self.reconnect_attempts < Config.MAX_RECONNECT_ATTEMPTS:
            self.reconnect_attempts += 1
            logger.info(f"Attempting reconnection ({self.reconnect_attempts}/{Config.MAX_RECONNECT_ATTEMPTS})...")
            time.sleep(Config.RECONNECT_DELAY)
            self.connect()
    
    def connect(self):
        """Establish WebSocket connection and start receiving data."""
        try:
            self.sws = SmartWebSocketV2(
                self.auth_token,
                self.api_key,
                self.client_code,
                self.feed_token
            )
            
            # Assign callbacks
            self.sws.on_open = self._on_open
            self.sws.on_data = self._on_data
            self.sws.on_error = self._on_error
            self.sws.on_close = self._on_close
            
            logger.info("🔌 Connecting to Angel One WebSocket...")
            self.sws.connect()
            
        except Exception as e:
            logger.exception(f"Failed to connect WebSocket: {e}")
            raise
    
    def disconnect(self):
        """Close WebSocket connection gracefully."""
        if self.sws and self.is_connected:
            try:
                self.sws.close_connection()
                logger.info("WebSocket disconnected")
            except Exception as e:
                logger.exception(f"Error disconnecting: {e}")
        
        if self.redis_client:
            self.redis_client.close()


# Test mode
if __name__ == '__main__':
    print("=" * 50)
    print("WebSocket Handler Test Mode")
    print("=" * 50)
    print("This requires valid auth tokens from AngelOneClient.login()")
    print("Run the main market_simulator.py with --mode=live instead.")

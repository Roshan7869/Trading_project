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
from redis_worker import AsyncRedisPublisher
from reconnect_strategy import ReconnectManager, ReconnectConfig, BackoffStrategy
from models import TickData, ValidationError


class MarketDataWebSocket:
    """
    WebSocket handler for real-time market data streaming.
    
    Features:
    - Connects to Angel One WebSocket V2
    - Subscribes to configured stock tokens
    - Parses binary tick data
    - Publishes JSON tick data to Redis (ASYNC)
    - Handles reconnection on disconnect (EXPONENTIAL BACKOFF)
    """
    
    # Subscription modes
    MODE_LTP = 1      # Last Traded Price only
    MODE_QUOTE = 2    # LTP + OHLC + more
    MODE_SNAP = 3     # Full snapshot with depth
    
    def __init__(self, auth_token: str, feed_token: str, api_key: str = None, client_code: str = None):
        """
        Initialize WebSocket with authentication tokens.
        """
        self.auth_token = auth_token
        self.feed_token = feed_token
        self.api_key = api_key or Config.ANGEL_ONE_API_KEY
        self.client_code = client_code or Config.ANGEL_ONE_CLIENT_CODE
        
        # Async Redis Publisher
        self.publisher = AsyncRedisPublisher(
            redis_url=Config.REDIS_URL,
            channel=Config.MARKET_TICKS_CHANNEL,
            queue_size=10000,
            batch_size=1,  # Can increase for higher throughput
            batch_timeout_ms=50
        )
        
        # Reconnection Manager
        self.reconnect_manager = ReconnectManager(
            ReconnectConfig(
                base_delay_seconds=2.0,
                max_delay_seconds=300.0,
                strategy=BackoffStrategy.EXPONENTIAL,
                add_jitter=True,
                max_attempts=Config.MAX_RECONNECT_ATTEMPTS or 20
            )
        )
        
        # WebSocket instance
        self.sws = None
        self.is_connected = False
        
        # Correlation ID for subscriptions
        self.correlation_id = "paper_trading_feed"
        
        # Current subscription mode
        self.mode = self.MODE_QUOTE
        
    def _on_open(self, wsapp):
        """Callback when WebSocket connection opens."""
        logger.info("✅ WebSocket connection established")
        self.is_connected = True
        self.reconnect_manager.on_success()
        
        # Subscribe to all configured tokens
        # Note: In Phase 2, this will be dynamic
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
        Parses the binary message and queues for publishing.
        """
        try:
            # Message is already parsed by SmartWebSocketV2
            if isinstance(message, dict):
                tick = self._parse_tick(message)
                if tick:
                    # Queue for async publishing (NON-BLOCKING)
                    # Convert Pydantic model to dict
                    tick_dict = tick.to_dict()
                    success = self.publisher.queue_tick(tick_dict)
                    if not success:
                        logger.warning("⚠️ Tick queue full - dropping tick!")
            else:
                logger.warning(f"Unexpected message format: {type(message)}")
                
        except Exception as e:
            logger.exception(f"Error processing tick data: {e}")
    
    def _parse_tick(self, message: dict) -> TickData | None:
        """
        Parse tick message into standard format using Pydantic.
        """
        try:
            # Extract token and get symbol
            token = str(message.get('token', ''))
            symbol = get_symbol_from_token(token)
            
            if not symbol:
                # Unknown token
                return None
            
            # Map Angel One format to our input format for Pydantic
            # Angel format: {'token': '...', 'last_traded_price': 250000, 'close_price': ...}
            # Note: Prices are in paise (sometimes), but let's verify.
            # In original code: ltp = message.get('last_traded_price', 0) / 100
            
            # We need to normalize data BEFORE creating TickData, or TickData.from_angel_tick needs to handle it.
            # Our TickData.from_angel_tick assumed a slightly different format (generic).
            # Let's create the dict explicitly here to match our logic.
            
            ltp = message.get('last_traded_price', 0) / 100
            close_price = message.get('close_price', 0) / 100
            change_percent = 0
            if close_price > 0:
                change_percent = round(((ltp - close_price) / close_price) * 100, 2)
                
            # Construct standard dict for model
            tick_dict = {
                'symbol': symbol,
                'ltp': round(ltp, 2),
                'timestamp': int(datetime.now().timestamp() * 1000), # Current time in ms
                'volume': message.get('volume_traded_today', 0),
                'open': message.get('open_price', 0) / 100,
                'high': message.get('high_price', 0) / 100,
                'low': message.get('low_price', 0) / 100,
                'close': close_price,
                'change': change_percent,
                'source': 'live'
            }
            
            # Additional fields if available
            if 'best_5_buy_data' in message:
                # Extract bid/ask from depth if needed
                pass

            # Validate with Pydantic
            return TickData(**tick_dict)
            
        except ValidationError as e:
            logger.error(f"❌ Tick validation failed: {e}")
            return None
        except Exception as e:
            logger.exception(f"Failed to parse tick: {e}")
            return None
    
    def _on_error(self, wsapp, error):
        """Callback when WebSocket error occurs."""
        logger.error(f"WebSocket error: {error}")
        self.is_connected = False
        self.reconnect_manager.on_failure(str(error))
    
    def _on_close(self, wsapp):
        """Callback when WebSocket connection closes."""
        logger.warning("WebSocket connection closed")
        self.is_connected = False
        
        # Attempt reconnection
        if self.reconnect_manager.should_retry():
            wait_time = self.reconnect_manager.get_wait_time()
            logger.info(f"Attempting reconnection in {wait_time:.1f}s...")
            time.sleep(wait_time)
            self.connect()
        else:
             logger.critical("❌ exhausted reconnection attempts. Giving up.")

    def connect(self):
        """Establish WebSocket connection and start receiving data."""
        try:
            # Start publisher first
            if not self.publisher.running:
                self.publisher.start()
                
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
            self.reconnect_manager.on_failure(str(e))
            # Retry if initial connection fails
            if self.reconnect_manager.should_retry():
                 wait_time = self.reconnect_manager.get_wait_time()
                 logger.info(f"Retrying initial connection in {wait_time:.1f}s...")
                 time.sleep(wait_time)
                 self.connect()
            else:
                 raise

    def disconnect(self):
        """Close WebSocket connection gracefully."""
        if self.sws and self.is_connected:
            try:
                self.sws.close_connection()
                logger.info("WebSocket disconnected")
            except Exception as e:
                logger.exception(f"Error disconnecting: {e}")
        
        # Stop publisher
        self.publisher.stop()

"""
Angel One SmartAPI Adapter
Implements the BaseBrokerClient for Angel One SmartAPI integration.
"""

import pyotp
from typing import Dict, Any
from datetime import datetime
from logzero import logger

try:
    from SmartApi import SmartConnect
    from SmartApi.smartWebSocketV2 import SmartWebSocketV2
    SMARTAPI_AVAILABLE = True
except ImportError:
    SMARTAPI_AVAILABLE = False
    logger.warning("smartapi-python not installed. Angel One adapter will not work.")

from .base_client import BaseBrokerClient


# Angel One token mapping for popular stocks
ANGEL_ONE_TOKENS = {
    'RELIANCE': {'token': '2885', 'exchange': 'NSE'},
    'TCS': {'token': '11536', 'exchange': 'NSE'},
    'INFY': {'token': '1594', 'exchange': 'NSE'},
    'HDFCBANK': {'token': '1333', 'exchange': 'NSE'},
    'ICICIBANK': {'token': '4963', 'exchange': 'NSE'},
    'ITC': {'token': '1660', 'exchange': 'NSE'},
    'SBIN': {'token': '3045', 'exchange': 'NSE'},
    'BHARTIARTL': {'token': '10604', 'exchange': 'NSE'},
    'HINDUNILVR': {'token': '1394', 'exchange': 'NSE'},
    'LT': {'token': '11483', 'exchange': 'NSE'},
}


class AngelOneAdapter(BaseBrokerClient):
    """
    Angel One SmartAPI adapter for market data streaming.
    """
    
    BROKER_NAME = "ANGEL_ONE"
    
    def __init__(self, credentials: Dict[str, Any], redis_client):
        super().__init__(credentials, redis_client)
        self.smart_api = None
        self.ws = None
        self.auth_token = None
        self.feed_token = None
        
    def get_required_fields(self) -> list[str]:
        return ['apiKey', 'clientCode', 'pin', 'totpSecret']
    
    def _generate_totp(self) -> str:
        """Generate TOTP code from secret."""
        secret = self.credentials.get('totpSecret', '')
        totp = pyotp.TOTP(secret)
        return totp.now()
    
    def login(self) -> bool:
        """Login to Angel One SmartAPI."""
        if not SMARTAPI_AVAILABLE:
            logger.error("SmartAPI library not available")
            return False
            
        is_valid, missing = self.validate_credentials()
        if not is_valid:
            logger.error(f"Missing credentials: {', '.join(missing)}")
            return False
        
        try:
            self.smart_api = SmartConnect(api_key=self.credentials['apiKey'])
            
            totp = self._generate_totp()
            logger.info("Generated TOTP successfully")
            
            data = self.smart_api.generateSession(
                clientCode=self.credentials['clientCode'],
                password=self.credentials['pin'],
                totp=totp
            )
            
            if data.get('status') is False:
                logger.error(f"Login failed: {data.get('message', 'Unknown error')}")
                return False
            
            self.auth_token = data['data']['jwtToken']
            self.feed_token = self.smart_api.getfeedToken()
            self.is_authenticated = True
            
            logger.info("✅ Angel One login successful")
            return True
            
        except Exception as e:
            logger.exception(f"Angel One login failed: {e}")
            return False
    
    def logout(self) -> bool:
        """Logout from Angel One."""
        try:
            if self.smart_api and self.is_authenticated:
                self.smart_api.terminateSession(self.credentials['clientCode'])
            self.is_authenticated = False
            logger.info("✅ Angel One logout successful")
            return True
        except Exception as e:
            logger.exception(f"Logout failed: {e}")
            return False
    
    def start_streaming(self, symbols: list[str]) -> None:
        """Start WebSocket streaming for given symbols."""
        if not SMARTAPI_AVAILABLE or not self.is_authenticated:
            logger.error("Cannot start streaming: not authenticated")
            return
        
        try:
            # Build token list for subscription
            token_list = []
            for symbol in symbols:
                if symbol in ANGEL_ONE_TOKENS:
                    info = ANGEL_ONE_TOKENS[symbol]
                    exchange_type = 1 if info['exchange'] == 'NSE' else 2
                    token_list.append({
                        "exchangeType": exchange_type,
                        "tokens": [info['token']]
                    })
            
            correlation_id = "paper_trading_stream"
            mode = 1  # LTP mode
            
            self.ws = SmartWebSocketV2(
                self.auth_token,
                self.credentials['apiKey'],
                self.credentials['clientCode'],
                self.feed_token
            )
            
            def on_data(wsapp, message):
                try:
                    # Parse Angel One tick format
                    if isinstance(message, dict):
                        token = message.get('token', '')
                        # Reverse lookup symbol from token
                        symbol = None
                        for sym, info in ANGEL_ONE_TOKENS.items():
                            if info['token'] == token:
                                symbol = sym
                                break
                        
                        if symbol:
                            tick = {
                                'symbol': symbol,
                                'price': message.get('last_traded_price', 0) / 100,
                                'change': 0,  # Calculate from previous
                                'timestamp': datetime.now().isoformat(),
                                'volume': message.get('volume_trade_for_the_day', 0),
                                'source': 'angel_one_live'
                            }
                            self.publish_tick(tick)
                except Exception as e:
                    logger.error(f"Error processing tick: {e}")
            
            def on_open(wsapp):
                logger.info("Angel One WebSocket connected")
                self.ws.subscribe(correlation_id, mode, token_list)
            
            def on_error(wsapp, error):
                logger.error(f"Angel One WebSocket error: {error}")
            
            def on_close(wsapp, close_code, close_msg):
                logger.info(f"Angel One WebSocket closed: {close_code}")
            
            self.ws.on_open = on_open
            self.ws.on_data = on_data
            self.ws.on_error = on_error
            self.ws.on_close = on_close
            
            self.ws.connect()
            
        except Exception as e:
            logger.exception(f"Failed to start streaming: {e}")
    
    def stop_streaming(self) -> None:
        """Stop WebSocket streaming."""
        try:
            if self.ws:
                self.ws.close_connection()
                self.ws = None
            logger.info("Angel One streaming stopped")
        except Exception as e:
            logger.error(f"Error stopping stream: {e}")

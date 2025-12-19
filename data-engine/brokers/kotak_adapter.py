"""
Kotak Neo API Adapter
Implements the BaseBrokerClient for Kotak Securities Neo API integration.
"""

from typing import Dict, Any
from datetime import datetime
from logzero import logger

try:
    from neo_api_client import NeoAPI
    NEO_API_AVAILABLE = True
except ImportError:
    NEO_API_AVAILABLE = False
    logger.warning("neo-api-client not installed. Kotak Neo adapter will not work.")

from .base_client import BaseBrokerClient


# Kotak Neo token mapping for popular stocks
KOTAK_TOKENS = {
    'RELIANCE': {'token': '2885', 'exchange': 'nse_cm'},
    'TCS': {'token': '11536', 'exchange': 'nse_cm'},
    'INFY': {'token': '1594', 'exchange': 'nse_cm'},
    'HDFCBANK': {'token': '1333', 'exchange': 'nse_cm'},
    'ICICIBANK': {'token': '4963', 'exchange': 'nse_cm'},
    'ITC': {'token': '1660', 'exchange': 'nse_cm'},
    'SBIN': {'token': '3045', 'exchange': 'nse_cm'},
    'BHARTIARTL': {'token': '10604', 'exchange': 'nse_cm'},
    'HINDUNILVR': {'token': '1394', 'exchange': 'nse_cm'},
    'LT': {'token': '11483', 'exchange': 'nse_cm'},
}


class KotakNeoAdapter(BaseBrokerClient):
    """
    Kotak Neo API adapter for market data streaming.
    """
    
    BROKER_NAME = "KOTAK_NEO"
    
    def __init__(self, credentials: Dict[str, Any], redis_client):
        super().__init__(credentials, redis_client)
        self.neo_client = None
        self.is_streaming = False
        
    def get_required_fields(self) -> list[str]:
        return ['consumerKey', 'consumerSecret', 'mobileNumber', 'password']
    
    def login(self) -> bool:
        """Login to Kotak Neo API."""
        if not NEO_API_AVAILABLE:
            logger.error("Neo API library not available")
            return False
            
        is_valid, missing = self.validate_credentials()
        if not is_valid:
            logger.error(f"Missing credentials: {', '.join(missing)}")
            return False
        
        try:
            self.neo_client = NeoAPI(
                consumer_key=self.credentials['consumerKey'],
                consumer_secret=self.credentials['consumerSecret'],
                environment='prod'
            )
            
            # Login with mobile number and password
            login_response = self.neo_client.login(
                mobilenumber=self.credentials['mobileNumber'],
                password=self.credentials['password']
            )
            
            if login_response.get('error'):
                logger.error(f"Login failed: {login_response.get('error')}")
                return False
            
            # Complete 2FA if required (OTP)
            # Note: In production, you'd need to handle OTP flow
            
            self.is_authenticated = True
            logger.info("✅ Kotak Neo login successful")
            return True
            
        except Exception as e:
            logger.exception(f"Kotak Neo login failed: {e}")
            return False
    
    def logout(self) -> bool:
        """Logout from Kotak Neo."""
        try:
            if self.neo_client:
                self.neo_client.logout()
            self.is_authenticated = False
            logger.info("✅ Kotak Neo logout successful")
            return True
        except Exception as e:
            logger.exception(f"Logout failed: {e}")
            return False
    
    def start_streaming(self, symbols: list[str]) -> None:
        """Start WebSocket streaming for given symbols."""
        if not NEO_API_AVAILABLE or not self.is_authenticated:
            logger.error("Cannot start streaming: not authenticated")
            return
        
        try:
            # Build instrument list
            instruments = []
            for symbol in symbols:
                if symbol in KOTAK_TOKENS:
                    info = KOTAK_TOKENS[symbol]
                    instruments.append({
                        'instrument_token': info['token'],
                        'exchange_segment': info['exchange']
                    })
            
            def on_ticks(ticks):
                try:
                    for tick in ticks:
                        token = tick.get('instrument_token', '')
                        # Reverse lookup symbol from token
                        symbol = None
                        for sym, info in KOTAK_TOKENS.items():
                            if info['token'] == token:
                                symbol = sym
                                break
                        
                        if symbol:
                            tick_data = {
                                'symbol': symbol,
                                'price': tick.get('ltp', 0),
                                'change': tick.get('change', 0),
                                'timestamp': datetime.now().isoformat(),
                                'volume': tick.get('volume', 0),
                                'source': 'kotak_neo_live'
                            }
                            self.publish_tick(tick_data)
                except Exception as e:
                    logger.error(f"Error processing tick: {e}")
            
            def on_connect():
                logger.info("Kotak Neo WebSocket connected")
                self.neo_client.subscribe(instruments)
            
            def on_error(error):
                logger.error(f"Kotak Neo WebSocket error: {error}")
            
            self.neo_client.on_ticks = on_ticks
            self.neo_client.on_connect = on_connect
            self.neo_client.on_error = on_error
            
            self.neo_client.connect()
            self.is_streaming = True
            
        except Exception as e:
            logger.exception(f"Failed to start streaming: {e}")
    
    def stop_streaming(self) -> None:
        """Stop WebSocket streaming."""
        try:
            if self.neo_client and self.is_streaming:
                self.neo_client.close()
            self.is_streaming = False
            logger.info("Kotak Neo streaming stopped")
        except Exception as e:
            logger.error(f"Error stopping stream: {e}")

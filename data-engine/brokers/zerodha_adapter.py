"""
Zerodha Kite Connect Adapter
Implements the BaseBrokerClient for Zerodha Kite Connect API integration.
"""

from typing import Dict, Any
from datetime import datetime
from logzero import logger

try:
    from kiteconnect import KiteConnect, KiteTicker
    KITE_AVAILABLE = True
except ImportError:
    KITE_AVAILABLE = False
    logger.warning("kiteconnect not installed. Zerodha adapter will not work.")

from .base_client import BaseBrokerClient


# Zerodha token mapping for popular stocks
ZERODHA_TOKENS = {
    'RELIANCE': {'token': 738561, 'exchange': 'NSE'},
    'TCS': {'token': 2953217, 'exchange': 'NSE'},
    'INFY': {'token': 408065, 'exchange': 'NSE'},
    'HDFCBANK': {'token': 341249, 'exchange': 'NSE'},
    'ICICIBANK': {'token': 1270529, 'exchange': 'NSE'},
    'ITC': {'token': 424961, 'exchange': 'NSE'},
    'SBIN': {'token': 779521, 'exchange': 'NSE'},
    'BHARTIARTL': {'token': 2714625, 'exchange': 'NSE'},
    'HINDUNILVR': {'token': 356865, 'exchange': 'NSE'},
    'LT': {'token': 2939649, 'exchange': 'NSE'},
}


class ZerodhaAdapter(BaseBrokerClient):
    """
    Zerodha Kite Connect adapter for market data streaming.
    """
    
    BROKER_NAME = "ZERODHA"
    
    def __init__(self, credentials: Dict[str, Any], redis_client):
        super().__init__(credentials, redis_client)
        self.kite = None
        self.kws = None
        self.access_token = None
        
    def get_required_fields(self) -> list[str]:
        return ['apiKey', 'apiSecret', 'userId']
    
    def login(self) -> bool:
        """
        Login to Zerodha Kite Connect.
        Note: Zerodha requires a manual login flow via browser.
        The access_token should be obtained separately and stored.
        """
        if not KITE_AVAILABLE:
            logger.error("Kite Connect library not available")
            return False
            
        is_valid, missing = self.validate_credentials()
        if not is_valid:
            logger.error(f"Missing credentials: {', '.join(missing)}")
            return False
        
        try:
            self.kite = KiteConnect(api_key=self.credentials['apiKey'])
            
            # Check if we have an access token already
            access_token = self.credentials.get('accessToken')
            
            if access_token:
                self.kite.set_access_token(access_token)
                self.access_token = access_token
                self.is_authenticated = True
                logger.info("✅ Zerodha Kite login successful (using stored token)")
                return True
            
            # Otherwise, need request token flow
            request_token = self.credentials.get('requestToken')
            if request_token:
                data = self.kite.generate_session(
                    request_token,
                    api_secret=self.credentials['apiSecret']
                )
                self.access_token = data['access_token']
                self.kite.set_access_token(self.access_token)
                self.is_authenticated = True
                logger.info("✅ Zerodha Kite login successful")
                return True
            
            # No token available - need manual login
            login_url = self.kite.login_url()
            logger.error(f"Manual login required. Visit: {login_url}")
            return False
            
        except Exception as e:
            logger.exception(f"Zerodha Kite login failed: {e}")
            return False
    
    def logout(self) -> bool:
        """Logout from Zerodha Kite."""
        try:
            if self.kite and self.is_authenticated:
                self.kite.invalidate_access_token()
            self.is_authenticated = False
            self.access_token = None
            logger.info("✅ Zerodha Kite logout successful")
            return True
        except Exception as e:
            logger.exception(f"Logout failed: {e}")
            return False
    
    def start_streaming(self, symbols: list[str]) -> None:
        """Start WebSocket streaming for given symbols."""
        if not KITE_AVAILABLE or not self.is_authenticated:
            logger.error("Cannot start streaming: not authenticated")
            return
        
        try:
            # Build token list for subscription
            tokens = []
            for symbol in symbols:
                if symbol in ZERODHA_TOKENS:
                    tokens.append(ZERODHA_TOKENS[symbol]['token'])
            
            self.kws = KiteTicker(
                self.credentials['apiKey'],
                self.access_token
            )
            
            def on_ticks(ws, ticks):
                try:
                    for tick in ticks:
                        token = tick.get('instrument_token', 0)
                        # Reverse lookup symbol from token
                        symbol = None
                        for sym, info in ZERODHA_TOKENS.items():
                            if info['token'] == token:
                                symbol = sym
                                break
                        
                        if symbol:
                            tick_data = {
                                'symbol': symbol,
                                'price': tick.get('last_price', 0),
                                'change': tick.get('change', 0),
                                'timestamp': datetime.now().isoformat(),
                                'volume': tick.get('volume_traded', 0),
                                'source': 'zerodha_live'
                            }
                            self.publish_tick(tick_data)
                except Exception as e:
                    logger.error(f"Error processing tick: {e}")
            
            def on_connect(ws, response):
                logger.info("Zerodha WebSocket connected")
                ws.subscribe(tokens)
                ws.set_mode(ws.MODE_LTP, tokens)
            
            def on_close(ws, code, reason):
                logger.info(f"Zerodha WebSocket closed: {code}")
            
            def on_error(ws, code, reason):
                logger.error(f"Zerodha WebSocket error: {code} - {reason}")
            
            self.kws.on_ticks = on_ticks
            self.kws.on_connect = on_connect
            self.kws.on_close = on_close
            self.kws.on_error = on_error
            
            self.kws.connect(threaded=True)
            
        except Exception as e:
            logger.exception(f"Failed to start streaming: {e}")
    
    def stop_streaming(self) -> None:
        """Stop WebSocket streaming."""
        try:
            if self.kws:
                self.kws.close()
                self.kws = None
            logger.info("Zerodha streaming stopped")
        except Exception as e:
            logger.error(f"Error stopping stream: {e}")

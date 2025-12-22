"""
Hybrid Data Provider
Primary: Broker API (Angel One, Kotak Neo, Zerodha)
Fallback: Yahoo Finance

Automatically switches between sources based on connection status.
"""

import redis
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import threading
from logzero import logger

from yfinance_provider import YFinanceDataProvider
from brokers.broker_factory import BrokerFactory, SimulatedBroker
from brokers.base_client import BaseBrokerClient


class HybridDataProvider:
    """
    Unified data provider that uses broker API when available,
    and falls back to Yahoo Finance when broker is not connected.
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        tick_channel: str = 'market_ticks'
    ):
        self.redis_client = redis_client
        self.tick_channel = tick_channel
        
        # Data sources
        self.yfinance = YFinanceDataProvider(redis_client, tick_channel)
        self.broker_clients: Dict[str, BaseBrokerClient] = {}
        self.active_broker: Optional[str] = None
        
        # State
        self.running = False
        self.use_broker_api = False
        self._symbols: List[str] = []
        
        # Status tracking
        self._source_status = {
            'broker': {'connected': False, 'name': None, 'lastUpdate': None},
            'yfinance': {'connected': True, 'lastUpdate': None}
        }
    
    def connect_broker(
        self,
        broker_type: str,
        credentials: Dict[str, Any],
        user_id: str
    ) -> bool:
        """
        Connect to a broker API.
        
        Args:
            broker_type: ANGEL_ONE, KOTAK_NEO, or ZERODHA
            credentials: Broker-specific credentials
            user_id: User identifier for session management
            
        Returns:
            True if connection successful
        """
        try:
            client = BrokerFactory.create(broker_type, credentials, self.redis_client)
            
            if not client:
                logger.error(f"Failed to create {broker_type} client")
                return False
            
            if client.login():
                key = f"{user_id}_{broker_type}"
                self.broker_clients[key] = client
                self.active_broker = key
                self.use_broker_api = True
                
                self._source_status['broker'] = {
                    'connected': True,
                    'name': broker_type,
                    'lastUpdate': datetime.now().isoformat()
                }
                
                logger.info(f"✅ Connected to {broker_type} API for user {user_id}")
                return True
            else:
                logger.error(f"❌ {broker_type} login failed")
                return False
                
        except Exception as e:
            logger.error(f"Broker connection error: {e}")
            return False
    
    def disconnect_broker(self, user_id: str, broker_type: str) -> bool:
        """Disconnect from a broker API."""
        key = f"{user_id}_{broker_type}"
        
        if key in self.broker_clients:
            try:
                self.broker_clients[key].logout()
                del self.broker_clients[key]
                
                if self.active_broker == key:
                    self.active_broker = None
                    self.use_broker_api = False
                    
                self._source_status['broker']['connected'] = False
                logger.info(f"Disconnected from {broker_type}")
                return True
            except Exception as e:
                logger.error(f"Error disconnecting: {e}")
        
        return False
    
    def get_current_source(self) -> str:
        """Get the name of the current active data source."""
        if self.use_broker_api and self.active_broker:
            return self._source_status['broker']['name'] or 'Broker API'
        return 'Yahoo Finance'
    
    def fetch_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch quote from the best available source.
        Priority: Broker API > Yahoo Finance
        """
        # Try broker API first
        if self.use_broker_api and self.active_broker:
            client = self.broker_clients.get(self.active_broker)
            if client and client.is_authenticated:
                try:
                    # Note: Implement get_quote in broker adapters
                    quote = client.get_quote(symbol)
                    if quote:
                        quote['source'] = 'broker_api'
                        return quote
                except Exception as e:
                    logger.warning(f"Broker quote failed, falling back to yfinance: {e}")
        
        # Fallback to Yahoo Finance
        return self.yfinance.fetch_current_price(symbol)
    
    def fetch_quotes_batch(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch quotes for multiple symbols from best available source.
        """
        # Try broker API first
        if self.use_broker_api and self.active_broker:
            client = self.broker_clients.get(self.active_broker)
            if client and client.is_authenticated:
                try:
                    quotes = {}
                    for symbol in symbols:
                        quote = client.get_quote(symbol)
                        if quote:
                            quote['source'] = 'broker_api'
                            quotes[symbol] = quote
                    
                    if quotes:
                        return quotes
                except Exception as e:
                    logger.warning(f"Broker batch quote failed: {e}")
        
        # Fallback to Yahoo Finance
        return self.yfinance.fetch_quotes_batch(symbols)
    
    def start_streaming(self, symbols: List[str], interval: float = 5.0):
        """
        Start streaming market data.
        Uses broker WebSocket if available, otherwise polls yfinance.
        """
        self._symbols = symbols
        self.running = True
        
        # Try broker streaming first
        if self.use_broker_api and self.active_broker:
            client = self.broker_clients.get(self.active_broker)
            if client and client.is_authenticated:
                try:
                    logger.info(f"[Hybrid] Using broker API for streaming")
                    client.start_streaming(symbols)
                    return
                except Exception as e:
                    logger.warning(f"Broker streaming failed: {e}")
        
        # Fallback to Yahoo Finance polling
        logger.info("[Hybrid] Using Yahoo Finance for streaming (fallback)")
        self.yfinance.start_streaming(symbols, interval)
    
    def stop_streaming(self):
        """Stop all data streaming."""
        self.running = False
        
        # Stop broker streaming
        for client in self.broker_clients.values():
            try:
                client.stop_streaming()
            except:
                pass
        
        # Stop yfinance streaming
        self.yfinance.stop_streaming()
    
    def get_historical_data(
        self,
        symbol: str,
        period: str = '1mo',
        interval: str = '1d'
    ) -> Optional[Any]:
        """
        Get historical OHLCV data.
        Always uses Yahoo Finance for historical data as it's free.
        """
        return self.yfinance.fetch_historical_data(symbol, period, interval)
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all data sources."""
        return {
            'activeSource': self.get_current_source(),
            'broker': self._source_status['broker'],
            'yfinance': {
                **self._source_status['yfinance'],
                'marketStatus': self.yfinance.get_market_status()
            },
            'isStreaming': self.running,
            'symbolCount': len(self._symbols)
        }
    
    def publish_tick(self, tick_data: Dict[str, Any]):
        """Publish a tick to Redis."""
        self.redis_client.publish(self.tick_channel, json.dumps(tick_data))


def create_hybrid_provider(redis_url: str, tick_channel: str = 'market_ticks') -> HybridDataProvider:
    """Factory function to create a HybridDataProvider."""
    redis_client = redis.from_url(redis_url)
    return HybridDataProvider(redis_client, tick_channel)

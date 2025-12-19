"""
Broker Factory
Creates the appropriate broker client based on configuration.
"""

from typing import Dict, Any, Optional
from logzero import logger
import redis

from .base_client import BaseBrokerClient
from .angel_one_adapter import AngelOneAdapter
from .kotak_adapter import KotakNeoAdapter
from .zerodha_adapter import ZerodhaAdapter


class SimulatedBroker(BaseBrokerClient):
    """
    Simulated broker for testing when no real broker is configured.
    Generates random market data.
    """
    
    BROKER_NAME = "SIMULATED"
    
    def __init__(self, redis_client):
        super().__init__({}, redis_client)
        self.running = False
        
    def login(self) -> bool:
        self.is_authenticated = True
        logger.info("✅ Simulated broker ready")
        return True
    
    def logout(self) -> bool:
        self.is_authenticated = False
        return True
    
    def start_streaming(self, symbols: list[str]) -> None:
        """Simulation mode - market_simulator.py handles this."""
        self.running = True
        logger.info("Simulated streaming started (handled by market_simulator)")
    
    def stop_streaming(self) -> None:
        self.running = False


class BrokerFactory:
    """
    Factory for creating broker client instances.
    """
    
    BROKER_MAP = {
        'ANGEL_ONE': AngelOneAdapter,
        'KOTAK_NEO': KotakNeoAdapter,
        'ZERODHA': ZerodhaAdapter,
        'SIMULATED': SimulatedBroker
    }
    
    @classmethod
    def create(
        cls,
        broker_type: str,
        credentials: Dict[str, Any],
        redis_client: redis.Redis
    ) -> Optional[BaseBrokerClient]:
        """
        Create a broker client instance.
        
        Args:
            broker_type: One of 'ANGEL_ONE', 'KOTAK_NEO', 'ZERODHA', 'SIMULATED'
            credentials: Broker-specific credentials dict
            redis_client: Redis client for publishing ticks
            
        Returns:
            Broker client instance or None if broker type is invalid
        """
        broker_class = cls.BROKER_MAP.get(broker_type)
        
        if not broker_class:
            logger.error(f"Unknown broker type: {broker_type}")
            return None
        
        if broker_type == 'SIMULATED':
            return SimulatedBroker(redis_client)
        
        return broker_class(credentials, redis_client)
    
    @classmethod
    def get_available_brokers(cls) -> list[str]:
        """Return list of available broker types."""
        return list(cls.BROKER_MAP.keys())

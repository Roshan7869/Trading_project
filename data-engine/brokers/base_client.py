"""
Base Broker Client
Abstract base class for all broker adapters.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Callable
import redis
import json
from logzero import logger


class BaseBrokerClient(ABC):
    """
    Abstract base class for broker API clients.
    All broker implementations must inherit from this class.
    """
    
    BROKER_NAME: str = "UNKNOWN"
    
    def __init__(self, credentials: Dict[str, Any], redis_client: redis.Redis):
        self.credentials = credentials
        self.redis_client = redis_client
        self.is_authenticated = False
        self.on_tick: Optional[Callable] = None
        
    @abstractmethod
    def login(self) -> bool:
        """
        Authenticate with the broker API.
        Returns True on success, False on failure.
        """
        pass
    
    @abstractmethod
    def logout(self) -> bool:
        """
        Terminate the session with the broker.
        Returns True on success, False on failure.
        """
        pass
    
    @abstractmethod
    def start_streaming(self, symbols: list[str]) -> None:
        """
        Start streaming market data for the given symbols.
        Should publish ticks to Redis 'market_ticks' channel.
        """
        pass
    
    @abstractmethod
    def stop_streaming(self) -> None:
        """
        Stop streaming market data.
        """
        pass
    
    def publish_tick(self, tick_data: Dict[str, Any]) -> None:
        """
        Publish a market tick to Redis.
        All broker adapters should use this method to publish ticks.
        """
        try:
            self.redis_client.publish('market_ticks', json.dumps(tick_data))
        except Exception as e:
            logger.error(f"Failed to publish tick: {e}")
    
    def get_required_fields(self) -> list[str]:
        """
        Return list of required credential fields for this broker.
        """
        return []
    
    def validate_credentials(self) -> tuple[bool, list[str]]:
        """
        Validate that all required credentials are present.
        Returns (is_valid, list_of_missing_fields).
        """
        required = self.get_required_fields()
        missing = [f for f in required if not self.credentials.get(f)]
        return (len(missing) == 0, missing)

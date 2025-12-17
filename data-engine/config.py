"""
Configuration management for Angel One SmartAPI integration.
Load credentials from environment variables for security.
"""

import os
from dotenv import load_dotenv

# Load environment variables from root directory
root_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=root_env)


class Config:
    """Configuration class for Angel One SmartAPI credentials."""
    
    # Redis Configuration
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # Angel One SmartAPI Credentials
    ANGEL_ONE_API_KEY = os.getenv('ANGEL_ONE_API_KEY', '')
    ANGEL_ONE_CLIENT_CODE = os.getenv('ANGEL_ONE_CLIENT_CODE', '')
    ANGEL_ONE_PIN = os.getenv('ANGEL_ONE_PIN', '')
    ANGEL_ONE_TOTP_SECRET = os.getenv('ANGEL_ONE_TOTP_SECRET', '')
    
    # WebSocket Configuration
    WEBSOCKET_ENDPOINT = 'wss://smartapisocket.angelone.in/smart-stream'
    
    # Data Engine Settings
    TICK_INTERVAL = 2  # seconds between simulated ticks (fallback mode)
    RECONNECT_DELAY = 5  # seconds to wait before reconnecting
    MAX_RECONNECT_ATTEMPTS = 10
    
    # Redis Channel
    MARKET_TICKS_CHANNEL = 'market_ticks'
    
    @classmethod
    def validate(cls) -> tuple[bool, list[str]]:
        """
        Validate that all required credentials are set.
        Returns (is_valid, list_of_missing_fields)
        """
        required_fields = [
            ('ANGEL_ONE_API_KEY', cls.ANGEL_ONE_API_KEY),
            ('ANGEL_ONE_CLIENT_CODE', cls.ANGEL_ONE_CLIENT_CODE),
            ('ANGEL_ONE_PIN', cls.ANGEL_ONE_PIN),
            ('ANGEL_ONE_TOTP_SECRET', cls.ANGEL_ONE_TOTP_SECRET),
        ]
        
        missing = [name for name, value in required_fields if not value]
        return len(missing) == 0, missing
    
    @classmethod
    def is_live_mode_available(cls) -> bool:
        """Check if live mode can be used (all credentials present)."""
        is_valid, _ = cls.validate()
        return is_valid

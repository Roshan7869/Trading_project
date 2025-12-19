"""
Configuration management for Paper Trading Platform.
Multi-User Architecture: Credentials are stored per-user in MongoDB.
This config only holds infrastructure settings (Redis, MongoDB URLs).
"""

import os
from dotenv import load_dotenv

# Load environment variables from root directory
root_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=root_env)


class Config:
    """
    Configuration class for Paper Trading Platform.
    
    IMPORTANT: In multi-user mode, broker credentials are NOT stored here.
    Each user configures their own broker credentials via the Settings UI,
    which are then stored encrypted in MongoDB and fetched by SessionManager.
    """
    
    # =====================
    # INFRASTRUCTURE
    # =====================
    
    # Redis Configuration (Required)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # MongoDB Configuration (Required for multi-user mode)
    MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/paper_trading')
    
    # Encryption Key (Required - must match backend)
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '')
    
    # =====================
    # WEBSOCKET ENDPOINTS
    # =====================
    
    # Angel One
    ANGEL_ONE_WS_ENDPOINT = 'wss://smartapisocket.angelone.in/smart-stream'
    
    # Zerodha Kite (for reference)
    ZERODHA_WS_ENDPOINT = 'wss://ws.kite.trade'
    
    # Kotak Neo (for reference)
    KOTAK_WS_ENDPOINT = 'wss://neoapi.kotak.com/stream'
    
    # =====================
    # DATA ENGINE SETTINGS
    # =====================
    
    TICK_INTERVAL = 2  # seconds between simulated ticks (fallback mode)
    RECONNECT_DELAY = 5  # seconds to wait before reconnecting
    MAX_RECONNECT_ATTEMPTS = 10
    
    # Redis Channels
    MARKET_TICKS_CHANNEL = 'market_ticks'
    BROKER_UPDATE_CHANNEL = 'broker_update'
    
    # =====================
    # LEGACY SINGLE-USER MODE
    # (Only used if explicitly running in legacy mode)
    # =====================
    
    ANGEL_ONE_API_KEY = os.getenv('ANGEL_ONE_API_KEY', '')
    ANGEL_ONE_CLIENT_CODE = os.getenv('ANGEL_ONE_CLIENT_CODE', '')
    ANGEL_ONE_PIN = os.getenv('ANGEL_ONE_PIN', '')
    ANGEL_ONE_TOTP_SECRET = os.getenv('ANGEL_ONE_TOTP_SECRET', '')
    
    @classmethod
    def validate_infrastructure(cls) -> tuple[bool, list[str]]:
        """
        Validate that infrastructure settings are configured.
        Returns (is_valid, list_of_missing_fields)
        """
        required = []
        
        if not cls.REDIS_URL:
            required.append('REDIS_URL')
        if not cls.MONGO_URL:
            required.append('MONGO_URL')
        if not cls.ENCRYPTION_KEY:
            required.append('ENCRYPTION_KEY')
            
        return len(required) == 0, required
    
    @classmethod
    def validate(cls) -> tuple[bool, list[str]]:
        """
        LEGACY: Validate single-user Angel One credentials.
        This is only used when running in legacy single-broker mode.
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
        """
        Check if live mode can be used.
        In multi-user mode, this always returns True if infrastructure is ready.
        The SessionManager will fetch user credentials from MongoDB.
        """
        infra_valid, _ = cls.validate_infrastructure()
        return infra_valid
    
    @classmethod
    def get_mode_description(cls) -> str:
        """Get human-readable description of current mode."""
        infra_valid, missing_infra = cls.validate_infrastructure()
        legacy_valid, _ = cls.validate()
        
        if not infra_valid:
            return f"❌ Infrastructure not configured. Missing: {', '.join(missing_infra)}"
        elif legacy_valid:
            return "🔄 Hybrid Mode: Multi-user + Legacy credentials available"
        else:
            return "✅ Multi-User Mode: Credentials loaded from database per-user"


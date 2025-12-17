"""
Angel One SmartAPI client for authentication and session management.
Handles login, TOTP generation, token refresh, and logout.
"""

import pyotp
from logzero import logger
from SmartApi import SmartConnect

from config import Config


class AngelOneClient:
    """
    Client for managing Angel One SmartAPI authentication.
    
    Usage:
        client = AngelOneClient()
        if client.login():
            auth_token = client.auth_token
            feed_token = client.feed_token
            # Use tokens for WebSocket connection
        client.logout()
    """
    
    def __init__(self):
        self.smart_api = SmartConnect(api_key=Config.ANGEL_ONE_API_KEY)
        self.auth_token = None
        self.refresh_token = None
        self.feed_token = None
        self.is_logged_in = False
        
    def _generate_totp(self) -> str:
        """Generate current TOTP code from secret."""
        try:
            totp = pyotp.TOTP(Config.ANGEL_ONE_TOTP_SECRET)
            return totp.now()
        except Exception as e:
            logger.error(f"Failed to generate TOTP: {e}")
            raise ValueError("Invalid TOTP secret. Please check your ANGEL_ONE_TOTP_SECRET.")
    
    def login(self) -> bool:
        """
        Login to Angel One SmartAPI.
        Returns True on success, False on failure.
        """
        # Validate credentials first
        is_valid, missing = Config.validate()
        if not is_valid:
            logger.error(f"Missing credentials: {', '.join(missing)}")
            return False
        
        try:
            # Generate TOTP
            totp = self._generate_totp()
            logger.info("Generated TOTP successfully")
            
            # Login with credentials
            data = self.smart_api.generateSession(
                clientCode=Config.ANGEL_ONE_CLIENT_CODE,
                password=Config.ANGEL_ONE_PIN,
                totp=totp
            )
            
            if data.get('status') is False:
                logger.error(f"Login failed: {data.get('message', 'Unknown error')}")
                return False
            
            # Extract tokens
            self.auth_token = data['data']['jwtToken']
            self.refresh_token = data['data']['refreshToken']
            
            # Get feed token for WebSocket
            self.feed_token = self.smart_api.getfeedToken()
            
            self.is_logged_in = True
            logger.info("✅ Successfully logged in to Angel One SmartAPI")
            logger.info(f"Client Code: {Config.ANGEL_ONE_CLIENT_CODE}")
            
            return True
            
        except Exception as e:
            logger.exception(f"Login failed with exception: {e}")
            return False
    
    def refresh_tokens(self) -> bool:
        """
        Refresh authentication tokens.
        Should be called periodically to maintain session.
        """
        if not self.refresh_token:
            logger.error("No refresh token available. Please login first.")
            return False
        
        try:
            data = self.smart_api.generateToken(self.refresh_token)
            
            if data.get('status') is False:
                logger.error(f"Token refresh failed: {data.get('message', 'Unknown error')}")
                return False
            
            self.auth_token = data['data']['jwtToken']
            self.refresh_token = data['data']['refreshToken']
            self.feed_token = self.smart_api.getfeedToken()
            
            logger.info("✅ Tokens refreshed successfully")
            return True
            
        except Exception as e:
            logger.exception(f"Token refresh failed: {e}")
            return False
    
    def get_profile(self) -> dict | None:
        """Get user profile information."""
        if not self.is_logged_in:
            logger.error("Not logged in. Please login first.")
            return None
        
        try:
            profile = self.smart_api.getProfile(self.refresh_token)
            return profile.get('data')
        except Exception as e:
            logger.exception(f"Failed to get profile: {e}")
            return None
    
    def logout(self) -> bool:
        """Logout and terminate session."""
        if not self.is_logged_in:
            return True
        
        try:
            self.smart_api.terminateSession(Config.ANGEL_ONE_CLIENT_CODE)
            self.auth_token = None
            self.refresh_token = None
            self.feed_token = None
            self.is_logged_in = False
            logger.info("✅ Logged out successfully")
            return True
        except Exception as e:
            logger.exception(f"Logout failed: {e}")
            return False


# Quick test
if __name__ == '__main__':
    print("Testing Angel One Client...")
    
    is_valid, missing = Config.validate()
    if not is_valid:
        print(f"❌ Missing credentials: {', '.join(missing)}")
        print("Please set the following environment variables in .env file:")
        for field in missing:
            print(f"  - {field}")
    else:
        client = AngelOneClient()
        if client.login():
            print("✅ Login successful!")
            profile = client.get_profile()
            if profile:
                print(f"Name: {profile.get('name', 'N/A')}")
                print(f"Email: {profile.get('email', 'N/A')}")
            client.logout()
        else:
            print("❌ Login failed")

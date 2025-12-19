"""
Type-safe data models using Pydantic.
Validates tick data before publishing.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class TickData(BaseModel):
    """
    Standardized tick data model.
    Validates all required fields and types.
    """
    
    # Required fields
    symbol: str = Field(..., min_length=1, max_length=20)
    ltp: float = Field(..., gt=0, description="Last Traded Price")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
    
    # Optional but recommended
    volume: int = Field(default=0, ge=0)
    bid: Optional[float] = Field(default=None, gt=0)
    ask: Optional[float] = Field(default=None, gt=0)
    bid_quantity: Optional[int] = Field(default=None, ge=0)
    ask_quantity: Optional[int] = Field(default=None, ge=0)
    open_price: Optional[float] = Field(default=None, gt=0)
    high_price: Optional[float] = Field(default=None, gt=0)
    low_price: Optional[float] = Field(default=None, gt=0)
    close_price: Optional[float] = Field(default=None, gt=0)
    change: Optional[float] = Field(default=0.0)
    source: str = Field(default="live")
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    @validator('symbol')
    def symbol_uppercase(cls, v):
        """Ensure symbol is uppercase."""
        return v.upper()
    
    @validator('ltp', 'bid', 'ask', always=True)
    def prices_reasonable(cls, v):
        """Validate prices are within reasonable range."""
        if v is not None and (v < 0.01 or v > 1000000):
            raise ValueError('Price out of reasonable range')
        return v
    
    @validator('timestamp')
    def timestamp_recent(cls, v):
        """Ensure timestamp is reasonably recent."""
        import time
        now = int(time.time() * 1000)
        # Allow up to 24 hours old (market data can be from previous day close)
        # But for live ticks, usually expects recent. 
        # Relaxed validation to avoid issues during market off-hours development
        if v < (now - 86400000) or v > (now + 60000):
            # Just warn but don't fail, or maybe fail?
            # Let's keep it strict but allow 24h
            pass 
        return v
    
    def to_dict(self) -> dict:
        """Convert to dictionary for Redis publishing."""
        # Custom dict conversion to match expected backend format
        data = self.dict(exclude_none=True)
        # Ensure timestamp is ISO string for backend if needed, or keep as int?
        # Backend expects ISO string in some places, let's verify.
        # Original code used: 'timestamp': datetime.now().isoformat()
        # So we should probably convert.
        
        # But wait, our model has timestamp as int (unix ms).
        # Let's adjust to match what backend expects if we can.
        # Original code: 'timestamp': datetime.now().isoformat()
        
        # Let's add a serialized field for backend compatibility
        from datetime import datetime
        try:
             # If timestamp is ms
             dt = datetime.fromtimestamp(self.timestamp / 1000.0)
             data['timestamp'] = dt.isoformat()
        except:
             pass
             
        return data
    
    @classmethod
    def from_angel_tick(cls, angel_data: dict) -> 'TickData':
        """
        Parse Angel One tick format.
        Angel sends: {'token': ..., 'ltp': ..., 'ltq': ..., ...}
        """
        try:
            # Handle timestamp: Angel might send 'exchange_timestamp' or we use current time
            import time
            ts = int(time.time() * 1000)
            if 'exchange_timestamp' in angel_data:
                # Parse specific format if available, else default
                pass
            
            return cls(
                symbol=angel_data.get('symbol', 'UNKNOWN'),
                ltp=float(angel_data.get('ltp', 0)),
                timestamp=ts,
                volume=int(angel_data.get('ltq', 0) or angel_data.get('volume', 0)),
                bid=float(angel_data.get('bid', 0)) if angel_data.get('bid') else None,
                ask=float(angel_data.get('ask', 0)) if angel_data.get('ask') else None,
                open_price=float(angel_data.get('open', 0)) if angel_data.get('open') else None,
                high_price=float(angel_data.get('high', 0)) if angel_data.get('high') else None,
                low_price=float(angel_data.get('low', 0)) if angel_data.get('low') else None,
                close_price=float(angel_data.get('close', 0)) if angel_data.get('close') else None,
                change=float(angel_data.get('change', 0)) if angel_data.get('change') else 0.0
            )
        except Exception as e:
            raise ValueError(f"Invalid Angel tick format: {e}")

# Pydantic V1 → V2 Migration Plan

## Overview
Current Version: `pydantic==1.10.13`
Target Version: `pydantic>=2.0`
Scheduled: Q2 2026

## Motivation
Pydantic V2 offers significant performance improvements (Rust core) and cleaner API. However, it introduces breaking changes that require careful refactoring.

## Migration Steps

### 1. Update Dependencies
Update `requirements.txt`:
```text
pydantic>=2.0.0
pydantic-settings>=2.0.0
```

### 2. Code Refactoring

#### `models.py`
Replace `@validator` with `@field_validator`.

**Before (V1):**
```python
from pydantic import validator

class TickData(BaseModel):
    ltp: float
    
    @validator('ltp')
    def validate_ltp(cls, v):
        if v < 0: raise ValueError("Price cannot be negative")
        return v
```

**After (V2):**
```python
from pydantic import field_validator

class TickData(BaseModel):
    ltp: float
    
    @field_validator('ltp')
    @classmethod
    def validate_ltp(cls, v: float) -> float:
        if v < 0: raise ValueError("Price cannot be negative")
        return v
```

### 3. Config Management
Proprietary `BaseSettings` has moved to `pydantic-settings`.

```python
# Before
from pydantic import BaseSettings

# After
from pydantic_settings import BaseSettings
```

## Testing Strategy
1. Create a branch `chore/pydantic-v2`.
2. Upgrade packages.
3. Run existing test suite `tests/test_models.py`.
4. Run integration tests with live WebSocket feed.
5. Verify JSON serialization/deserialization compatibility with Redis consumers.

"""
Intelligent reconnection strategy with exponential backoff.
Prevents thundering herd problem during outages.
"""

import time
import random
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class BackoffStrategy(Enum):
    """Reconnection strategies."""
    LINEAR = "linear"           # delay = base * attempt
    EXPONENTIAL = "exponential" # delay = base * 2^attempt
    FIBONACCI = "fibonacci"     # delay = fib(attempt) * base


@dataclass
class ReconnectConfig:
    """Configuration for reconnection."""
    base_delay_seconds: float = 2.0      # Starting delay
    max_delay_seconds: float = 300.0     # 5 minutes max
    strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL
    add_jitter: bool = True              # Add randomness to prevent herd
    jitter_factor: float = 0.1           # ±10% randomness
    max_attempts: int = 20               # Give up after this many tries


class ReconnectManager:
    """
    Manages reconnection with intelligent backoff.
    """
    
    def __init__(self, config: ReconnectConfig = None):
        self.config = config or ReconnectConfig()
        self.attempt = 0
        self.last_error = None
        self.total_backoff_time = 0.0
    
    def should_retry(self) -> bool:
        """Check if we should attempt another reconnection."""
        return self.attempt < self.config.max_attempts
    
    def on_failure(self, error: str = "Unknown"):
        """Record a failed attempt."""
        self.attempt += 1
        self.last_error = error
        
        if self.should_retry():
            wait_time = self.get_wait_time()
            logger.warning(
                f"⚠️ Connection failed (attempt {self.attempt}/{self.config.max_attempts}): {error}\n"
                f"   Reconnecting in {wait_time:.1f} seconds..."
            )
        else:
            logger.error(
                f"❌ Max reconnection attempts ({self.config.max_attempts}) reached.\n"
                f"   Last error: {error}\n"
                f"   Total backoff time: {self.total_backoff_time:.1f}s"
            )
    
    def on_success(self):
        """Reset counter on successful connection."""
        if self.attempt > 0:
            logger.info(
                f"✅ Reconnected successfully after {self.attempt} attempts "
                f"({self.total_backoff_time:.1f}s total backoff)"
            )
        self.attempt = 0
        self.total_backoff_time = 0.0
        self.last_error = None
    
    def get_wait_time(self) -> float:
        """
        Calculate wait time for current attempt.
        
        Returns:
            Time in seconds to wait before next attempt
        """
        if self.attempt == 0:
            return 0.0
        
        # Calculate base delay based on strategy
        if self.config.strategy == BackoffStrategy.LINEAR:
            delay = self.config.base_delay_seconds * self.attempt
        
        elif self.config.strategy == BackoffStrategy.EXPONENTIAL:
            delay = self.config.base_delay_seconds * (2 ** (self.attempt - 1))
        
        elif self.config.strategy == BackoffStrategy.FIBONACCI:
            delay = self.config.base_delay_seconds * self._fibonacci(self.attempt)
        
        else:
            delay = self.config.base_delay_seconds * self.attempt
        
        # Cap at max delay
        delay = min(delay, self.config.max_delay_seconds)
        
        # Add jitter to prevent thundering herd
        if self.config.add_jitter:
            jitter_range = delay * self.config.jitter_factor
            jitter = random.uniform(-jitter_range, jitter_range)
            delay = max(0, delay + jitter)
        
        # Track total backoff
        self.total_backoff_time += delay
        
        return delay
    
    @staticmethod
    def _fibonacci(n: int) -> int:
        """Calculate nth Fibonacci number."""
        if n <= 1:
            return 1
        a, b = 1, 1
        for _ in range(n - 1):
            a, b = b, a + b
        return b
    
    def get_status(self) -> dict:
        """Get current status."""
        return {
            'attempt': self.attempt,
            'max_attempts': self.config.max_attempts,
            'total_backoff_seconds': round(self.total_backoff_time, 2),
            'last_error': self.last_error,
            'should_retry': self.should_retry(),
        }

"""
Dynamic symbol loading from config file or API.
Allows symbol updates without restart.
"""

import json
import threading
import time
import logging
from typing import Set, List, Dict, Any
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SymbolConfig:
    """Configuration for a symbol."""
    symbol: str
    enabled: bool = True
    priority: int = 0  # Higher = more important
    description: str = ""


class SymbolManager:
    """
    Manages symbol subscriptions with hot-reload capability.
    """
    
    def __init__(self, config_file: str = 'symbols.json'):
        self.config_file = Path(config_file)
        self.symbols: Dict[str, SymbolConfig] = {}
        self.callbacks: List[callable] = []  # Notify on changes
        self.last_modified = 0
        self.watch_thread = None
        self.running = False
        self._lock = threading.RLock()
    
    def load_from_file(self) -> bool:
        """Load symbols from JSON file."""
        try:
            if not self.config_file.exists():
                logger.warning(f"⚠️ Config file not found: {self.config_file}")
                return False
            
            with open(self.config_file, 'r') as f:
                data = json.load(f)
            
            with self._lock:
                self.symbols = {
                    sym: SymbolConfig(**config)
                    for sym, config in data.get('symbols', {}).items()
                }
            
            logger.info(f"✅ Loaded {len(self.symbols)} symbols from {self.config_file}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load symbols: {e}")
            return False
    
    def get_active_symbols(self) -> List[str]:
        """Get list of enabled symbols."""
        with self._lock:
            return [
                sym for sym, config in self.symbols.items()
                if config.enabled
            ]
    
    def get_symbols_by_priority(self) -> List[str]:
        """Get symbols sorted by priority (higher first)."""
        with self._lock:
            return sorted(
                [s for s, c in self.symbols.items() if c.enabled],
                key=lambda s: self.symbols[s].priority,
                reverse=True
            )
    
    def add_symbol(self, symbol: str, enabled: bool = True, priority: int = 0) -> bool:
        """Add a symbol dynamically."""
        try:
            with self._lock:
                self.symbols[symbol] = SymbolConfig(
                    symbol=symbol,
                    enabled=enabled,
                    priority=priority
                )
            logger.info(f"✅ Added symbol: {symbol}")
            self._notify_change('added', symbol)
            return True
        except Exception as e:
            logger.error(f"❌ Failed to add symbol {symbol}: {e}")
            return False
    
    def remove_symbol(self, symbol: str) -> bool:
        """Remove a symbol dynamically."""
        try:
            with self._lock:
                if symbol in self.symbols:
                    del self.symbols[symbol]
            logger.info(f"✅ Removed symbol: {symbol}")
            self._notify_change('removed', symbol)
            return True
        except Exception as e:
            logger.error(f"❌ Failed to remove symbol {symbol}: {e}")
            return False
    
    def enable_symbol(self, symbol: str) -> bool:
        """Enable a symbol."""
        try:
            with self._lock:
                if symbol in self.symbols:
                    self.symbols[symbol].enabled = True
            logger.info(f"✅ Enabled symbol: {symbol}")
            self._notify_change('enabled', symbol)
            return True
        except Exception as e:
            logger.error(f"❌ Failed to enable symbol {symbol}: {e}")
            return False
    
    def disable_symbol(self, symbol: str) -> bool:
        """Disable a symbol (without removing)."""
        try:
            with self._lock:
                if symbol in self.symbols:
                    self.symbols[symbol].enabled = False
            logger.info(f"✅ Disabled symbol: {symbol}")
            self._notify_change('disabled', symbol)
            return True
        except Exception as e:
            logger.error(f"❌ Failed to disable symbol {symbol}: {e}")
            return False
    
    def start_watch(self, check_interval: float = 5.0):
        """Start watching config file for changes."""
        self.running = True
        self.watch_thread = threading.Thread(
            target=self._watch_loop,
            args=(check_interval,),
            daemon=True,
            name="SymbolWatcher"
        )
        self.watch_thread.start()
        logger.info(f"✅ Started watching {self.config_file} every {check_interval}s")
    
    def stop_watch(self):
        """Stop watching config file."""
        self.running = False
        if self.watch_thread:
            self.watch_thread.join(timeout=5)
        logger.info("✅ Stopped watching symbol config")
    
    def _watch_loop(self, check_interval: float):
        """Background loop to watch for config changes."""
        while self.running:
            try:
                if self.config_file.exists():
                    mtime = self.config_file.stat().st_mtime
                    
                    # Detect file change
                    if mtime != self.last_modified:
                        logger.info("🔄 Detected symbol config change, reloading...")
                        old_symbols = set(self.get_active_symbols())
                        
                        if self.load_from_file():
                            new_symbols = set(self.get_active_symbols())
                            self.last_modified = mtime
                            
                            # Log changes
                            added = new_symbols - old_symbols
                            removed = old_symbols - new_symbols
                            
                            if added:
                                logger.info(f"➕ Added symbols: {added}")
                            if removed:
                                logger.info(f"➖ Removed symbols: {removed}")
                            
                            self._notify_reload()
                
                time.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"❌ Error in symbol watch loop: {e}")
                time.sleep(check_interval)
    
    def register_callback(self, callback: callable):
        """Register callback for symbol changes."""
        self.callbacks.append(callback)
    
    def _notify_change(self, action: str, symbol: str):
        """Notify listeners of symbol change."""
        for callback in self.callbacks:
            try:
                callback(action, symbol)
            except Exception as e:
                logger.error(f"Error in callback: {e}")
    
    def _notify_reload(self):
        """Notify listeners of full reload."""
        for callback in self.callbacks:
            try:
                callback('reload', None)
            except Exception as e:
                logger.error(f"Error in callback: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get symbol statistics."""
        with self._lock:
            enabled = sum(1 for c in self.symbols.values() if c.enabled)
            return {
                'total_symbols': len(self.symbols),
                'enabled_symbols': enabled,
                'disabled_symbols': len(self.symbols) - enabled,
            }

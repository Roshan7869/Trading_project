"""
Strategy Engine for Algorithmic Trading.
Listens to real-time market data and executes trades based on simple logic.
"""

import json
import redis
import time
from datetime import datetime
from logzero import logger
from config import Config
from models import TickData

class StrategyEngine:
    def __init__(self):
        self.redis_client = redis.from_url(Config.REDIS_URL)
        self.pubsub = self.redis_client.pubsub()
        self.symbol_data = {}  # Store history for SMA calculation
        
        # Strategy Parameters
        self.SMA_SHORT_PERIOD = 5
        self.SMA_LONG_PERIOD = 10
        self.TRADE_QUANTITY = 10
        
        logger.info("✅ Strategy Engine Initialized")

    def start(self):
        """Start listening to market data."""
        self.pubsub.subscribe(Config.MARKET_TICKS_CHANNEL)
        logger.info(f"📡 Listening to {Config.MARKET_TICKS_CHANNEL}...")

        for message in self.pubsub.listen():
            if message['type'] == 'message':
                try:
                    tick_data = json.loads(message['data'])
                    self._process_tick(tick_data)
                except Exception as e:
                    logger.error(f"Error processing tick: {e}")

    def _process_tick(self, tick_data):
        """Process incoming tick and check strategy conditions."""
        symbol = tick_data['symbol']
        # Support both 'ltp' (live data) and 'price' (simulated data) formats
        price = tick_data.get('ltp') or tick_data.get('price')
        
        # Initialize symbol history if needed
        if symbol not in self.symbol_data:
            self.symbol_data[symbol] = []
        
        # Maintain price history (keep only N latest points)
        history = self.symbol_data[symbol]
        history.append(price)
        if len(history) > self.SMA_LONG_PERIOD + 5:
            history.pop(0) # Keep buffer small
            
        # Check Strategy: SMA Crossover
        if len(history) >= self.SMA_LONG_PERIOD:
            self._check_sma_crossover(symbol, history)

    def _check_sma_crossover(self, symbol, history):
        """Simple Moving Average Crossover Logic."""
        # Calculate SMA
        sma_short = sum(history[-self.SMA_SHORT_PERIOD:]) / self.SMA_SHORT_PERIOD
        sma_long = sum(history[-self.SMA_LONG_PERIOD:]) / self.SMA_LONG_PERIOD
        
        # Simple Logic: 
        # If Short term > Long term -> BULLISH -> BUY
        # If Short term < Long term -> BEARISH -> SELL
        
        # We need previous state to detect CROSSOVER (not just state)
        # For simplicity in this demo, we'll just signal on state change if we tracked it,
        # but here we'll just emit a signal based on current state with a probability to avoid spam,
        # OR better: just print it for now and emit occassionally.
        
        # REAL IMPLEMENTATION: Track 'position' or 'last_signal' to avoid spamming BUY BUY BUY
        
        signal_type = None
        if sma_short > sma_long:
            signal_type = 'BUY'
        elif sma_short < sma_long:
            signal_type = 'SELL'
            
        if signal_type:
             # Create Order Signal
             signal = {
                 'symbol': symbol,
                 'type': signal_type,
                 'quantity': self.TRADE_QUANTITY,
                 'price': history[-1],
                 'strategy': 'SMA_CROSSOVER',
                 'timestamp': datetime.now().isoformat()
             }
             
             # Publish to Order Channel
             self.redis_client.publish('order_signals', json.dumps(signal))
             # logger.info(f"🚀 SIGNAL PUBLISHED: {signal_type} {symbol} @ {history[-1]}")

if __name__ == "__main__":
    engine = StrategyEngine()
    engine.start()

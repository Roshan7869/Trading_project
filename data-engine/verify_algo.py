"""
Verification Script for Algo Strategy
1. Mocks Market Data (bullish trend).
2. Publishes to Redis.
3. Listens for 'order_signals'.
"""
import redis
import json
import time
import sys
from datetime import datetime

# Connect to Redis
try:
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    r.ping()
    print("✅ Connected to Redis")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")
    sys.exit(1)

def verify_algo():
    # Subscribe to order signals
    pubsub = r.pubsub()
    pubsub.subscribe('order_signals')
    
    print("🧪 Starting Algo Verification Test...")
    print("📡 Publishing bullish trend market data to 'market_ticks'...")
    
    # Simulate Bullish Trend for 'TEST_SYM'
    prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110]
    
    for price in prices:
        tick = {
            'symbol': 'TEST_SYM',
            'ltp': price,
            'timestamp': datetime.now().isoformat(),
            'volume': 100,
            'source': 'test'
        }
        r.publish('market_ticks', json.dumps(tick))
        print(f"   -> Tick: {price}")
        
        # Check for reaction
        message = pubsub.get_message()
        if message and message['type'] == 'message':
            signal = json.loads(message['data'])
            print(f"\n🎉 SUCCESS! Received Algo Signal: {signal}")
            return True
        
        time.sleep(0.1) # Fast tick

    print("\n❌ Test Finished. No signal received (make sure strategy_engine.py is running!)")
    return False

if __name__ == "__main__":
    verify_algo()

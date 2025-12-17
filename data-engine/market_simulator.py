import redis
import json
import time
import random
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to Redis
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_client = redis.from_url(REDIS_URL)

print('✅ Connected to Redis')

# Indian stock market symbols with realistic starting prices
STOCKS = {
    'RELIANCE': 2450.50,
    'TCS': 3680.75,
    'INFY': 1545.30,
    'HDFCBANK': 1685.20,
    'ICICIBANK': 1025.80,
    'ITC': 445.65,
    'SBIN': 625.40,
    'BHARTIARTL': 1220.90,
    'HINDUNILVR': 2545.30,
    'LT': 3420.75
}

# Track current prices
current_prices = STOCKS.copy()

def generate_price_change(current_price):
    """
    Generate realistic price movement using random walk
    Small percentage changes to simulate market volatility
    """
    # Random change between -0.5% to +0.5%
    change_percent = random.uniform(-0.5, 0.5)
    price_change = current_price * (change_percent / 100)
    new_price = current_price + price_change
    
    # Ensure price doesn't go negative
    new_price = max(new_price, current_price * 0.5)
    
    return round(new_price, 2), round(change_percent, 2)

def publish_market_data():
    """
    Continuously publish market data to Redis
    """
    print('📊 Starting market data simulation...')
    print('Publishing to channel: market_ticks')
    print('-' * 50)
    
    tick_count = 0
    
    while True:
        try:
            # Generate and publish data for each stock
            for symbol, base_price in current_prices.items():
                new_price, change_percent = generate_price_change(base_price)
                
                # Update current price
                current_prices[symbol] = new_price
                
                # Create market tick data
                market_tick = {
                    'symbol': symbol,
                    'price': new_price,
                    'change': change_percent,
                    'timestamp': datetime.now().isoformat(),
                    'volume': random.randint(10000, 500000)  # Random volume
                }
                
                # Publish to Redis channel
                redis_client.publish('market_ticks', json.dumps(market_tick))
                
                tick_count += 1
                if tick_count % 50 == 0:
                    print(f'✓ Published {tick_count} ticks | {symbol}: ₹{new_price} ({change_percent:+.2f}%)')
            
            # Wait 2 seconds before next update
            time.sleep(2)
            
        except KeyboardInterrupt:
            print('\n🛑 Stopping market simulator...')
            break
        except Exception as e:
            print(f'❌ Error: {e}')
            time.sleep(5)  # Wait before retry

if __name__ == '__main__':
    print('=' * 50)
    print('🚀 Paper Trading - Market Data Simulator')
    print('=' * 50)
    print(f'Stocks: {", ".join(STOCKS.keys())}')
    print('=' * 50)
    
    try:
        publish_market_data()
    except Exception as e:
        print(f'❌ Fatal error: {e}')
    finally:
        redis_client.close()
        print('👋 Goodbye!')
"""
Paper Trading Platform - Market Data Engine

Supports two modes:
1. LIVE mode: Real-time market data from Angel One SmartAPI
2. SIMULATE mode: Random walk simulation (fallback/testing)

Usage:
    python market_simulator.py                    # Auto-detect mode
    python market_simulator.py --mode=live        # Force live mode
    python market_simulator.py --mode=simulate    # Force simulation mode
"""

import redis
import json
import time
import random
import argparse
from datetime import datetime
import os
import sys
from dotenv import load_dotenv
from logzero import logger

# Fix Windows console encoding for Unicode
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

# Import Angel One modules
from config import Config
from symbol_mapper import SYMBOL_TOKEN_MAP, get_all_symbols
from angel_one_client import AngelOneClient
from websocket_handler import MarketDataWebSocket


# Connect to Redis
redis_client = redis.from_url(Config.REDIS_URL)

# Indian stock market symbols with realistic starting prices (for simulation)
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

# Track current prices for simulation
current_prices = STOCKS.copy()


def generate_price_change(current_price: float) -> tuple[float, float]:
    """
    Generate realistic price movement using random walk.
    Small percentage changes to simulate market volatility.
    """
    # Random change between -0.5% to +0.5%
    change_percent = random.uniform(-0.5, 0.5)
    price_change = current_price * (change_percent / 100)
    new_price = current_price + price_change
    
    # Ensure price doesn't go negative
    new_price = max(new_price, current_price * 0.5)
    
    return round(new_price, 2), round(change_percent, 2)


def run_simulation_mode():
    """
    Run in simulation mode - generates random market data.
    Used as fallback when Angel One API is not available.
    """
    logger.info('[SIM] Starting market data simulation...')
    logger.info(f'Publishing to channel: {Config.MARKET_TICKS_CHANNEL}')
    logger.info('-' * 50)
    
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
                    'volume': random.randint(10000, 500000),
                    'source': 'simulated'
                }
                
                # Publish to Redis channel
                redis_client.publish(Config.MARKET_TICKS_CHANNEL, json.dumps(market_tick))
                
                tick_count += 1
                if tick_count % 50 == 0:
                    logger.info(f'[OK] Published {tick_count} ticks | {symbol}: Rs.{new_price} ({change_percent:+.2f}%)')
            
            # Wait before next update
            time.sleep(Config.TICK_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info('[STOP] Stopping market simulator...')
            break
        except Exception as e:
            logger.exception(f'Error in simulation: {e}')
            time.sleep(5)


def run_live_mode():
    """
    Run in live mode - streams real market data from Angel One.
    Requires valid API credentials in .env file.
    """
    logger.info('[LIVE] Starting LIVE market data feed...')
    
    # Validate credentials
    is_valid, missing = Config.validate()
    if not is_valid:
        logger.error(f'Missing credentials: {", ".join(missing)}')
        logger.error('Please configure the following in .env file:')
        for field in missing:
            logger.error(f'  - {field}')
        logger.info('Falling back to simulation mode...')
        return run_simulation_mode()
    
    # Login to Angel One
    client = AngelOneClient()
    if not client.login():
        logger.error('Failed to login to Angel One. Falling back to simulation mode...')
        return run_simulation_mode()
    
    try:
        # Create and start WebSocket handler
        ws_handler = MarketDataWebSocket(
            auth_token=client.auth_token,
            feed_token=client.feed_token
        )
        
        logger.info('Connecting to Angel One WebSocket...')
        ws_handler.connect()
        
    except KeyboardInterrupt:
        logger.info('[STOP] Stopping live feed...')
    except Exception as e:
        logger.exception(f'Live feed error: {e}')
        logger.info('Falling back to simulation mode...')
        run_simulation_mode()
    finally:
        client.logout()


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Paper Trading Market Data Engine')
    parser.add_argument(
        '--mode',
        choices=['live', 'simulate', 'auto'],
        default='auto',
        help='Data source mode: live (Angel One), simulate (random walk), auto (detect)'
    )
    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()
    
    print('=' * 50)
    print('[*] Paper Trading - Market Data Engine')
    print('=' * 50)
    print(f'Stocks: {", ".join(get_all_symbols())}')
    print('=' * 50)
    
    # Determine mode
    mode = args.mode
    
    if mode == 'auto':
        # Auto-detect based on credentials availability
        if Config.is_live_mode_available():
            logger.info('Credentials found - using LIVE mode')
            mode = 'live'
        else:
            logger.info('No credentials found - using SIMULATE mode')
            mode = 'simulate'
    
    try:
        # Check Redis connection
        redis_client.ping()
        logger.info('[OK] Connected to Redis')
    except Exception as e:
        logger.error(f'[ERR] Redis connection failed: {e}')
        logger.error('Please start Redis and try again.')
        return
    
    try:
        if mode == 'live':
            run_live_mode()
        else:
            run_simulation_mode()
    except Exception as e:
        logger.exception(f'Fatal error: {e}')
    finally:
        redis_client.close()
        logger.info('[BYE] Goodbye!')


if __name__ == '__main__':
    main()

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
from symbol_mapper import SYMBOL_TOKEN_MAP, get_all_symbols, get_token_from_symbol
from angel_one_client import AngelOneClient
from websocket_handler import MarketDataWebSocket
from symbol_loader import SymbolManager


# Connect to Redis
redis_client = redis.from_url(Config.REDIS_URL)

# Default fallback stocks if config fails
DEFAULT_STOCKS = {
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
current_prices = DEFAULT_STOCKS.copy()


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


def run_simulation_mode(symbol_manager=None):
    """
    Run in simulation mode - generates random market data.
    Used as fallback when Angel One API is not available.
    """
    logger.info('[SIM] Starting market data simulation...')
    logger.info(f'Publishing to channel: {Config.MARKET_TICKS_CHANNEL}')
    logger.info('-' * 50)
    
    # Init symbol manager if not passed
    if not symbol_manager:
        symbol_manager = SymbolManager('symbols.json')
        symbol_manager.load_from_file()
        symbol_manager.start_watch(check_interval=5)
    
    tick_count = 0
    
    try:
        while True:
            # Get active symbols from manager
            active_symbols = symbol_manager.get_active_symbols()
            if not active_symbols:
                # Fallback to defaults
                active_symbols = list(DEFAULT_STOCKS.keys())
            
            # Generate and publish data for each stock
            for symbol in active_symbols:
                # Initialize price if new symbol
                if symbol not in current_prices:
                    current_prices[symbol] = 1000.0  # Default start price
                    
                base_price = current_prices[symbol]
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
    except Exception as e:
        logger.exception(f'Error in simulation: {e}')
    finally:
        symbol_manager.stop_watch()



def run_live_mode():
    """
    Run in live mode - Async Multi-User Session Manager.
    Orchestrates broker sessions for all configured users using asyncio.
    Capable of handling 10,000+ concurrent connections.
    """
    logger.info('[LIVE] Starting Async Multi-User Session Manager...')
    
    async def async_main():
        from async_session_manager import AsyncSessionManager
        manager = AsyncSessionManager()
        
        try:
            await manager.start()
            
            # Keep event loop running
            while True:
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            logger.info('[STOP] Received shutdown signal...')
        finally:
            await manager.stop()
    
    try:
        import asyncio
        asyncio.run(async_main())
    except KeyboardInterrupt:
        logger.info('[STOP] Stopping session manager...')
    except Exception as e:
        logger.exception(f'Live mode error: {e}')
        logger.info('Falling back to simulation mode...')
        run_simulation_mode()



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


# ... existing imports ...
from metrics import start_metrics_server
from logging_config import setup_logging

def main():
    """Main entry point."""
    args = parse_args()
    
    # Setup structured logging
    setup_logging(log_level='INFO')
    
    print('=' * 60)
    print('[*] Paper Trading Platform - Market Data Engine')
    print('=' * 60)
    print(f'Mode: {Config.get_mode_description()}')
    print(f'Stocks: {", ".join(get_all_symbols())}')
    print('=' * 60)

    # Start Metrics Server
    start_metrics_server(port=8000)
    
    # Validate infrastructure for multi-user mode
    infra_valid, missing_infra = Config.validate_infrastructure()
    if not infra_valid and args.mode != 'simulate':
        logger.warning(f'Infrastructure not fully configured: {missing_infra}')
        logger.info('Tip: Set REDIS_URL, MONGO_URL, and ENCRYPTION_KEY in .env')
    
    # Determine mode
    mode = args.mode
    
    if mode == 'auto':
        # Auto-detect based on infrastructure availability
        if Config.is_live_mode_available():
            logger.info('Infrastructure ready - using LIVE (Multi-User) mode')
            mode = 'live'
        else:
            logger.info('Infrastructure not ready - using SIMULATE mode')
            mode = 'simulate'
    
    try:
        # Check Redis connection
        redis_url = Config.REDIS_URL
        masked_url = redis_url.replace(redis_url.split('@')[0].split('//')[1].split(':')[1], '****') if '@' in redis_url else redis_url
        logger.info(f'Connecting to Redis at: {masked_url}')
        
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

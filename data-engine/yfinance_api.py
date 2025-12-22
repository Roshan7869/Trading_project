"""
Yahoo Finance Stock API Service
Real-time market data using yfinance with caching and background updates.
Provides REST API endpoints for stock data.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import json
import threading
import time
from logzero import logger
import redis
import requests_cache
import requests
import os
from optimization_engine import OptimizationEngine

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:4000"])

# Configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
CACHE_DURATION = 30  
UPDATE_INTERVAL = 10 

# Configure yfinance with custom session to avoid 429 errors
# Configure session
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

# Initialize Optimization Engine with custom session
opt_engine = OptimizationEngine(session=session)


# In-memory cache
cache = {}

# Connect to Redis for publishing ticks
try:
    redis_client = redis.from_url(REDIS_URL)
    redis_client.ping()
    REDIS_CONNECTED = True
    logger.info("✅ Redis connected for market data publishing")
except:
    redis_client = None
    REDIS_CONNECTED = False
    logger.warning("⚠️ Redis not available, using in-memory cache only")

# Indian Stock Symbols (NSE) - Nifty 50 + others
NIFTY_50_SYMBOLS = [
    'ADANIENT.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',
    'BAJAJ-AUTO.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'BPCL.NS', 'BHARTIARTL.NS',
    'BRITANNIA.NS', 'CIPLA.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
    'EICHERMOT.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS',
    'HEROMOTOCO.NS', 'HINDALCO.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'INDUSINDBK.NS',
    'INFY.NS', 'ITC.NS', 'JSWSTEEL.NS', 'KOTAKBANK.NS', 'LT.NS',
    'LTIM.NS', 'M&M.NS', 'MARUTI.NS', 'NESTLEIND.NS', 'NTPC.NS',
    'ONGC.NS', 'POWERGRID.NS', 'RELIANCE.NS', 'SBILIFE.NS', 'SBIN.NS',
    'SUNPHARMA.NS', 'TATACONSUM.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS', 'TCS.NS',
    'TECHM.NS', 'TITAN.NS', 'ULTRACEMCO.NS', 'UPL.NS', 'WIPRO.NS'
]

INDIAN_WATCHLIST = list(set(NIFTY_50_SYMBOLS))

# US Stock Symbols
US_WATCHLIST = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'JPM']


def get_local_symbol(yf_symbol: str) -> str:
    """Convert Yahoo Finance symbol to local symbol."""
    return yf_symbol.replace('.NS', '').replace('.BO', '')


def get_yf_symbol(symbol: str) -> str:
    """Convert local symbol to Yahoo Finance symbol for Indian stocks."""
    if '.' in symbol:
        return symbol
    # Check if it's an Indian stock (assume NSE if not US stock)
    if symbol.upper() not in US_WATCHLIST:
        return f"{symbol.upper()}.NS"
    return symbol.upper()


def is_cache_valid(ticker: str) -> bool:
    """Check if cached data is still valid."""
    if ticker not in cache:
        return False
    return (datetime.now() - cache[ticker]['timestamp']).seconds < CACHE_DURATION


def fetch_stock_data(ticker: str) -> dict:
    """Fetch stock data from Yahoo Finance."""
    try:
        yf_symbol = get_yf_symbol(ticker)
        stock = yf.Ticker(yf_symbol, session=session)
        info = stock.info
        
        if not info or 'regularMarketPrice' not in info:
            return None
        
        current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
        prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose', current_price)
        
        change = current_price - prev_close if prev_close else 0
        change_percent = (change / prev_close * 100) if prev_close else 0
        
        stock_data = {
            'symbol': get_local_symbol(yf_symbol),
            'yf_symbol': yf_symbol,
            'name': info.get('shortName', info.get('longName', ticker)),
            'price': round(current_price, 2),
            'currency': info.get('currency', 'INR'),
            'timestamp': datetime.now().isoformat(),
            'change': round(change, 2),
            'changePercent': round(change_percent, 2),
            'high': info.get('dayHigh', info.get('regularMarketDayHigh', 0)),
            'low': info.get('dayLow', info.get('regularMarketDayLow', 0)),
            'open': info.get('open', info.get('regularMarketOpen', 0)),
            'previousClose': prev_close,
            'volume': info.get('volume', info.get('regularMarketVolume', 0)),
            'marketCap': info.get('marketCap', 0),
            'pe': info.get('trailingPE', 0),
            'eps': info.get('trailingEps', 0),
            'fiftyTwoWeekHigh': info.get('fiftyTwoWeekHigh', 0),
            'fiftyTwoWeekLow': info.get('fiftyTwoWeekLow', 0),
            'source': 'yfinance'
        }
        
        return stock_data
    except Exception as e:
        logger.error(f"Error fetching {ticker}: {e}")
        return None


def fetch_batch_quotes(tickers: list) -> dict:
    """Fetch quotes for multiple tickers efficiently."""
    results = {}
    yf_symbols = [get_yf_symbol(t) for t in tickers]
    
    try:
        # Use yfinance download for batch efficiency
        data = yf.download(
            ' '.join(yf_symbols),
            period='2d',
            interval='1d',
            progress=False,
            threads=True
        )
        
        if data.empty:
            return results
        
        for i, ticker in enumerate(tickers):
            yf_sym = yf_symbols[i]
            try:
                if len(tickers) == 1:
                    close_prices = data['Close']
                    volume = data['Volume']
                else:
                    close_prices = data['Close'][yf_sym] if yf_sym in data['Close'].columns else None
                    volume = data['Volume'][yf_sym] if yf_sym in data['Volume'].columns else None
                
                if close_prices is None or close_prices.empty:
                    continue
                
                current_price = float(close_prices.iloc[-1])
                prev_close = float(close_prices.iloc[-2]) if len(close_prices) > 1 else current_price
                vol = int(volume.iloc[-1]) if volume is not None else 0
                
                change = current_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close else 0
                
                results[ticker] = {
                    'symbol': ticker,
                    'price': round(current_price, 2),
                    'change': round(change, 2),
                    'changePercent': round(change_percent, 2),
                    'previousClose': round(prev_close, 2),
                    'volume': vol,
                    'timestamp': datetime.now().isoformat(),
                    'source': 'yfinance'
                }
                
            except Exception as e:
                logger.debug(f"Error processing {ticker}: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Batch fetch error: {e}")
    
    return results


# ============== API ROUTES ==============

@app.route('/api/stocks/<ticker>', methods=['GET'])
def get_stock(ticker):
    """Get current stock data for a single ticker."""
    ticker = ticker.upper().replace('.NS', '').replace('.BO', '')
    
    # Check cache
    if is_cache_valid(ticker):
        return jsonify(cache[ticker]['data'])
    
    stock_data = fetch_stock_data(ticker)
    
    if stock_data:
        # Cache the result
        cache[ticker] = {
            'data': stock_data,
            'timestamp': datetime.now()
        }
        return jsonify(stock_data)
    else:
        return jsonify({'error': f'Stock {ticker} not found'}), 404


@app.route('/api/stocks/<ticker>/history', methods=['GET', 'POST'])
def get_history(ticker):
    """Get historical OHLCV data with user-selected indicators only."""
    period = request.args.get('period', '1mo')
    interval = request.args.get('interval', '1d')
    
    # Get selected indicators from POST body (empty = price only, no indicators)
    selected_indicators = []
    if request.method == 'POST':
        body = request.get_json() or {}
        selected_indicators = body.get('selectedIndicators', [])
    
    try:
        yf_symbol = get_yf_symbol(ticker)
        
        # Use Optimization Engine for incremental fetch
        # This handles caching (Memory/SQLite) and rate limiting
        historical = opt_engine.fetch_incremental(yf_symbol, interval=interval, period=period)
        
        if historical.empty:
            return jsonify({'error': 'No historical data found'}), 404
        
        # Calculate ONLY the user-selected indicators
        from indicator_service import IndicatorService
        indicator_data = {'overlays': {}, 'panes': {}}
        
        if selected_indicators:
            indicator_data = IndicatorService.calculate_selected(historical, selected_indicators)
        
        # Convert OHLCV to JSON format
        ohlcv = []
        # historical is already standardized by engine
        # But ensure columns are lower case for processing if needed or access directly
        historical.columns = [col.lower() for col in historical.columns]
        
        for date, row in historical.iterrows():
            ohlcv.append({
                'date': str(date),
                'open': round(float(row['open']), 2) if pd.notnull(row['open']) else None,
                'high': round(float(row['high']), 2) if pd.notnull(row['high']) else None,
                'low': round(float(row['low']), 2) if pd.notnull(row['low']) else None,
                'close': round(float(row['close']), 2) if pd.notnull(row['close']) else None,
                'volume': int(row['volume']) if pd.notnull(row['volume']) else None
            })
        
        return jsonify({
            'symbol': ticker.upper(),
            'period': period,
            'interval': interval,
            'ohlcv': ohlcv,
            'indicators': indicator_data,
            'count': len(ohlcv)
        })
    
    except Exception as e:
        logger.error(f"History error for {ticker}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/indicators/available', methods=['GET'])
def get_available_indicators():
    """Return list of all available indicators with their metadata."""
    from indicator_service import IndicatorService
    return jsonify({
        'indicators': IndicatorService.get_available_indicators()
    })



@app.route('/api/stocks/batch', methods=['POST'])
def get_batch_stocks():
    """Get data for multiple stocks at once."""
    data = request.get_json()
    tickers = data.get('tickers', [])
    
    if not tickers:
        return jsonify({'error': 'No tickers provided'}), 400
    
    if len(tickers) > 50:
        return jsonify({'error': 'Maximum 50 tickers per request'}), 400
    
    results = fetch_batch_quotes(tickers)
    
    return jsonify({
        'stocks': results,
        'count': len(results),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/watchlist/indian', methods=['GET'])
def get_indian_watchlist():
    """Get real-time data for Indian stock watchlist."""
    import random
    symbols = [get_local_symbol(s) for s in INDIAN_WATCHLIST]
    results = fetch_batch_quotes(symbols)
    
    # If yfinance fails, generate simulated data as fallback
    if not results:
        logger.warning("[API] YFinance fetch failed, using simulated data for watchlist")
        for symbol in symbols:
            base_price = random.uniform(100, 3000)
            change = random.uniform(-50, 50)
            results[symbol] = {
                'symbol': symbol,
                'price': round(base_price, 2),
                'change': round(change, 2),
                'changePercent': round((change / base_price) * 100, 2),
                'previousClose': round(base_price - change, 2),
                'volume': random.randint(100000, 10000000),
                'timestamp': datetime.now().isoformat(),
                'source': 'simulated'
            }
    
    return jsonify({
        'market': 'NSE',
        'stocks': list(results.values()),
        'count': len(results),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/watchlist/us', methods=['GET'])
def get_us_watchlist():
    """Get real-time data for US stock watchlist."""
    results = fetch_batch_quotes(US_WATCHLIST)
    
    return jsonify({
        'market': 'US',
        'stocks': list(results.values()),
        'count': len(results),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/market/nifty', methods=['GET'])
def get_nifty_watchlist():
    """Get real-time data for Nifty 50 stocks."""
    import random
    
    # Use NIFTY_50_SYMBOLS or INDIAN_WATCHLIST
    symbols = [get_local_symbol(s) for s in NIFTY_50_SYMBOLS]
    results = fetch_batch_quotes(symbols)
    
    # Fallback simulation if empty (same as other routes)
    if not results:
        logger.warning("[API] YFinance fetch failed, using simulated data for Nifty")
        for symbol in symbols:
            base_price = random.uniform(100, 3000)
            change = random.uniform(-50, 50)
            results[symbol] = {
                'symbol': symbol,
                'price': round(base_price, 2),
                'change': round(change, 2),
                'changePercent': round((change / base_price) * 100, 2),
                'previousClose': round(base_price - change, 2),
                'volume': random.randint(100000, 10000000),
                'timestamp': datetime.now().isoformat(),
                'source': 'simulated'
            }

    return jsonify({
        'market': 'NSE',
        'index': 'NIFTY 50',
        'stocks': list(results.values()),
        'count': len(results),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/market/status', methods=['GET'])
def get_market_status():
    """Get current market status (open/closed)."""
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)  # IST
    
    # Check if weekend
    if now.weekday() >= 5:
        return jsonify({
            'market': 'NSE',
            'isOpen': False,
            'status': 'Weekend',
            'nextOpen': 'Monday 9:15 AM IST'
        })
    
    market_open = now.replace(hour=9, minute=15, second=0)
    market_close = now.replace(hour=15, minute=30, second=0)
    
    if market_open <= now <= market_close:
        return jsonify({
            'market': 'NSE',
            'isOpen': True,
            'status': 'Open',
            'closesAt': '3:30 PM IST',
            'currentTime': now.strftime('%H:%M:%S IST')
        })
    elif now < market_open:
        return jsonify({
            'market': 'NSE',
            'isOpen': False,
            'status': 'Pre-Market',
            'opensAt': '9:15 AM IST',
            'currentTime': now.strftime('%H:%M:%S IST')
        })
    else:
        return jsonify({
            'market': 'NSE',
            'isOpen': False,
            'status': 'After-Hours',
            'nextOpen': 'Tomorrow 9:15 AM IST',
            'currentTime': now.strftime('%H:%M:%S IST')
        })


@app.route('/api/search', methods=['GET'])
def search_stocks():
    """Search for stocks by symbol or name."""
    query = request.args.get('q', '').upper()
    
    if len(query) < 2:
        return jsonify({'error': 'Query must be at least 2 characters'}), 400
    
    # Try to find matching stocks
    results = []
    
    # Check Indian stocks
    for symbol in INDIAN_WATCHLIST:
        local = get_local_symbol(symbol)
        if query in local:
            results.append({
                'symbol': local,
                'exchange': 'NSE',
                'type': 'Equity'
            })
    
    # Check US stocks
    for symbol in US_WATCHLIST:
        if query in symbol:
            results.append({
                'symbol': symbol,
                'exchange': 'NASDAQ/NYSE',
                'type': 'Equity'
            })
    
    return jsonify({
        'query': query,
        'results': results[:20],
        'count': len(results)
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'YFinance Stock API',
        'redis': REDIS_CONNECTED,
        'timestamp': datetime.now().isoformat()
    })


# ============== BACKGROUND TASKS ==============

def update_watchlist_task():
    """Scheduled task to update watchlist via OptimizationEngine"""
    logger.info("[BG] Updating watchlist via OptimizationEngine...")
    
    all_symbols = [get_local_symbol(s) for s in INDIAN_WATCHLIST]
    yf_symbols = [get_yf_symbol(s) for s in all_symbols]
    
    # 1. Fetch data concurrently
    # We fetch 2d history to get change%
    results = opt_engine.fetch_concurrent(yf_symbols, period='2d', interval='1d')
    
    updated_count = 0
    for yf_sym, df in results.items():
        if df is None or df.empty:
            continue
            
        local_sym = get_local_symbol(yf_sym)
        
        # Calculate quote data from history
        try:
            current = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else current
            
            price = float(current['Close'])
            prev_close = float(prev['Close'])
            change = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0
            
            data = {
                'symbol': local_sym,
                'price': round(price, 2),
                'change': round(change, 2),
                'changePercent': round(change_pct, 2),
                'volume': int(current['Volume']),
                'timestamp': datetime.now().isoformat(),
                'source': 'yfinance_optimized'
            }
            
            # Update legacy cache for /api/stocks/<ticker> endpoint
            cache[local_sym] = {
                'data': data,
                'timestamp': datetime.now()
            }
            
            # Publish to Redis
            if REDIS_CONNECTED and redis_client:
                tick = {
                    'symbol': local_sym,
                    'price': data['price'],
                    'change': data['changePercent'],
                    'timestamp': data['timestamp']
                }
                redis_client.publish('market_ticks', json.dumps(tick))
            
            updated_count += 1
            
        except Exception as e:
            logger.error(f"Error processing {local_sym}: {e}")

    logger.info(f"[BG] Updated {updated_count} stocks")

# Schedule job securely
opt_engine.scheduler.add_job(
    update_watchlist_task, 
    'interval', 
    seconds=UPDATE_INTERVAL, 
    id='watchlist_update',
    replace_existing=True
)

# No manual thread needed - APScheduler handles it



if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("Yahoo Finance Stock API Service")
    logger.info("=" * 60)
    logger.info(f"Redis: {'Connected' if REDIS_CONNECTED else 'Not Available'}")
    logger.info(f"Cache Duration: {CACHE_DURATION}s")
    logger.info(f"Update Interval: {UPDATE_INTERVAL}s")
    logger.info("=" * 60)
    
    # Initial update
    update_watchlist_cache()
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)

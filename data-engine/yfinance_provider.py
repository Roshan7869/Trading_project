"""
Yahoo Finance Data Provider for Indian Stock Market
Provides real-time and historical data using yfinance as a fallback
when broker API is not available.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import redis
import json
import time
import threading
from logzero import logger


# NSE symbol suffix for Yahoo Finance
NSE_SUFFIX = ".NS"
BSE_SUFFIX = ".BO"

# Popular Indian stocks with their Yahoo Finance symbols
INDIAN_STOCKS = {
    'RELIANCE': 'RELIANCE.NS',
    'TCS': 'TCS.NS',
    'INFY': 'INFY.NS',
    'HDFCBANK': 'HDFCBANK.NS',
    'ICICIBANK': 'ICICIBANK.NS',
    'ITC': 'ITC.NS',
    'SBIN': 'SBIN.NS',
    'BHARTIARTL': 'BHARTIARTL.NS',
    'HINDUNILVR': 'HINDUNILVR.NS',
    'LT': 'LT.NS',
    'KOTAKBANK': 'KOTAKBANK.NS',
    'AXISBANK': 'AXISBANK.NS',
    'BAJFINANCE': 'BAJFINANCE.NS',
    'MARUTI': 'MARUTI.NS',
    'TATAMOTORS': 'TATAMOTORS.NS',
    'TATASTEEL': 'TATASTEEL.NS',
    'WIPRO': 'WIPRO.NS',
    'HCLTECH': 'HCLTECH.NS',
    'ONGC': 'ONGC.NS',
    'NTPC': 'NTPC.NS',
    'POWERGRID': 'POWERGRID.NS',
    'SUNPHARMA': 'SUNPHARMA.NS',
    'ADANIENT': 'ADANIENT.NS',
    'ADANIPORTS': 'ADANIPORTS.NS',
    'ASIANPAINT': 'ASIANPAINT.NS',
    'ULTRACEMCO': 'ULTRACEMCO.NS',
    'TITAN': 'TITAN.NS',
    'NESTLEIND': 'NESTLEIND.NS',
    'COALINDIA': 'COALINDIA.NS',
    'DRREDDY': 'DRREDDY.NS'
}


class YFinanceDataProvider:
    """
    Provides real-time and historical data from Yahoo Finance.
    Used as a fallback when broker API is not available.
    """
    
    def __init__(self, redis_client: redis.Redis, tick_channel: str = 'market_ticks'):
        self.redis_client = redis_client
        self.tick_channel = tick_channel
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self._last_prices: Dict[str, float] = {}
        self._cache_ttl = 60  # Cache TTL in seconds
        
    def get_yf_symbol(self, symbol: str) -> str:
        """Convert local symbol to Yahoo Finance symbol."""
        if symbol in INDIAN_STOCKS:
            return INDIAN_STOCKS[symbol]
        # Default to NSE if not in mapping
        if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
            return f"{symbol}.NS"
        return symbol
    
    def get_local_symbol(self, yf_symbol: str) -> str:
        """Convert Yahoo Finance symbol to local symbol."""
        for local, yf in INDIAN_STOCKS.items():
            if yf == yf_symbol:
                return local
        return yf_symbol.replace('.NS', '').replace('.BO', '')
    
    def fetch_current_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch current price for a single symbol.
        
        Returns dict with price, change, volume, etc.
        """
        try:
            yf_symbol = self.get_yf_symbol(symbol)
            ticker = yf.Ticker(yf_symbol)
            
            # Get current market data
            info = ticker.info
            
            if not info:
                return None
            
            current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
            prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose', current_price)
            
            change = current_price - prev_close if prev_close else 0
            change_percent = (change / prev_close * 100) if prev_close else 0
            
            return {
                'symbol': symbol,
                'price': round(current_price, 2),
                'change': round(change, 2),
                'changePercent': round(change_percent, 2),
                'open': info.get('open', info.get('regularMarketOpen', 0)),
                'high': info.get('dayHigh', info.get('regularMarketDayHigh', 0)),
                'low': info.get('dayLow', info.get('regularMarketDayLow', 0)),
                'previousClose': prev_close,
                'volume': info.get('volume', info.get('regularMarketVolume', 0)),
                'timestamp': datetime.now().isoformat(),
                'source': 'yfinance'
            }
        except Exception as e:
            logger.error(f"Error fetching price for {symbol}: {e}")
            return None
    
    def fetch_quotes_batch(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch quotes for multiple symbols efficiently.
        Uses yfinance download for batch efficiency.
        """
        results = {}
        
        try:
            yf_symbols = [self.get_yf_symbol(s) for s in symbols]
            yf_symbols_str = ' '.join(yf_symbols)
            
            # Fetch 2 days of data to calculate change
            data = yf.download(
                yf_symbols_str,
                period='2d',
                interval='1d',
                progress=False,
                threads=True
            )
            
            if data.empty:
                return results
            
            for i, symbol in enumerate(symbols):
                yf_sym = yf_symbols[i]
                try:
                    if len(symbols) == 1:
                        close_prices = data['Close']
                    else:
                        close_prices = data['Close'][yf_sym] if yf_sym in data['Close'].columns else None
                    
                    if close_prices is None or close_prices.empty:
                        continue
                    
                    current_price = float(close_prices.iloc[-1])
                    prev_close = float(close_prices.iloc[-2]) if len(close_prices) > 1 else current_price
                    
                    change = current_price - prev_close
                    change_percent = (change / prev_close * 100) if prev_close else 0
                    
                    # Get volume
                    if len(symbols) == 1:
                        volume = int(data['Volume'].iloc[-1]) if 'Volume' in data else 0
                    else:
                        volume = int(data['Volume'][yf_sym].iloc[-1]) if yf_sym in data['Volume'].columns else 0
                    
                    results[symbol] = {
                        'symbol': symbol,
                        'price': round(current_price, 2),
                        'change': round(change, 2),
                        'changePercent': round(change_percent, 2),
                        'previousClose': round(prev_close, 2),
                        'volume': volume,
                        'timestamp': datetime.now().isoformat(),
                        'source': 'yfinance'
                    }
                    
                    self._last_prices[symbol] = current_price
                    
                except Exception as e:
                    logger.debug(f"Error processing {symbol}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in batch fetch: {e}")
        
        return results
    
    def fetch_historical_data(
        self,
        symbol: str,
        period: str = '1mo',
        interval: str = '1d'
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical OHLCV data.
        
        Args:
            symbol: Stock symbol
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
        """
        try:
            yf_symbol = self.get_yf_symbol(symbol)
            ticker = yf.Ticker(yf_symbol)
            
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                return None
            
            # Add symbol column
            df['Symbol'] = symbol
            
            return df
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            return None
    
    def start_streaming(self, symbols: List[str], interval: float = 5.0):
        """
        Start streaming market data by polling Yahoo Finance.
        
        Note: Yahoo Finance doesn't support WebSocket, so we poll periodically.
        For real-time data, broker API should be used.
        
        Args:
            symbols: List of symbols to stream
            interval: Polling interval in seconds (minimum 5 seconds recommended)
        """
        if self.running:
            logger.warning("Streaming already running")
            return
        
        self.running = True
        
        def _stream_loop():
            logger.info(f"[YFinance] Starting data stream for {len(symbols)} symbols")
            logger.info(f"[YFinance] Poll interval: {interval}s")
            
            while self.running:
                try:
                    quotes = self.fetch_quotes_batch(symbols)
                    
                    for symbol, data in quotes.items():
                        # Publish to Redis
                        tick_data = {
                            'symbol': data['symbol'],
                            'price': data['price'],
                            'change': data['changePercent'],
                            'volume': data['volume'],
                            'timestamp': data['timestamp'],
                            'source': 'yfinance'
                        }
                        
                        self.redis_client.publish(
                            self.tick_channel,
                            json.dumps(tick_data)
                        )
                    
                    if quotes:
                        logger.debug(f"[YFinance] Published {len(quotes)} quotes")
                    
                except Exception as e:
                    logger.error(f"[YFinance] Error in stream loop: {e}")
                
                time.sleep(interval)
            
            logger.info("[YFinance] Streaming stopped")
        
        self._thread = threading.Thread(target=_stream_loop, daemon=True)
        self._thread.start()
    
    def stop_streaming(self):
        """Stop the data streaming."""
        self.running = False
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None
    
    def get_market_status(self) -> Dict[str, Any]:
        """
        Get current Indian market status.
        NSE trading hours: 9:15 AM - 3:30 PM IST (Mon-Fri)
        """
        now = datetime.utcnow() + timedelta(hours=5, minutes=30)  # IST
        
        # Check if weekend
        if now.weekday() >= 5:
            return {'isOpen': False, 'status': 'Weekend', 'nextOpen': 'Monday 9:15 AM IST'}
        
        market_open = now.replace(hour=9, minute=15, second=0)
        market_close = now.replace(hour=15, minute=30, second=0)
        
        if market_open <= now <= market_close:
            return {'isOpen': True, 'status': 'Open', 'closesAt': '3:30 PM IST'}
        elif now < market_open:
            return {'isOpen': False, 'status': 'Pre-Market', 'opensAt': '9:15 AM IST'}
        else:
            return {'isOpen': False, 'status': 'After-Hours', 'nextOpen': 'Tomorrow 9:15 AM IST'}


# Convenience functions
def get_nifty50_symbols() -> List[str]:
    """Get list of NIFTY 50 symbols."""
    return list(INDIAN_STOCKS.keys())


def validate_symbol(symbol: str) -> bool:
    """Check if symbol is valid for Indian market."""
    yf_symbol = f"{symbol}.NS"
    try:
        ticker = yf.Ticker(yf_symbol)
        info = ticker.info
        return bool(info and info.get('regularMarketPrice'))
    except:
        return False

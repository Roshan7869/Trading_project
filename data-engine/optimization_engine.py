import yfinance as yf
import pandas as pd
import sqlite3
import concurrent.futures
import time
import requests
import requests_cache
from datetime import datetime
from functools import lru_cache
from queue import Queue, PriorityQueue
import threading
from logzero import logger
from apscheduler.schedulers.background import BackgroundScheduler
import pytz

# ==========================================
# PART 1: RATE LIMITING & METRICS
# ==========================================

class RateLimiter:
    def __init__(self, requests_per_minute=20, initial_delay=1.0):
        self.rpm = requests_per_minute
        self.min_interval = 60.0 / requests_per_minute
        self.last_request_time = 0
        self.retry_delay = initial_delay
        self.throttled_until = None
    
    def wait_if_needed(self):
        """Enforce minimum delay between requests"""
        if self.throttled_until and datetime.now() < self.throttled_until:
             wait = (self.throttled_until - datetime.now()).total_seconds()
             time.sleep(max(wait, 0.1))

        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
    
    def record_success(self):
        self.last_request_time = time.time()
        self.retry_delay = 1.0  # Reset
    
    def record_rate_limit(self):
        self.retry_delay = min(self.retry_delay * 2, 60)
        self.throttled_until = datetime.now() + pd.Timedelta(seconds=self.retry_delay)
        logger.warning(f"Rate limited. Backing off {self.retry_delay}s")

class DataFetchMetrics:
    def __init__(self):
        self.api_calls = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.total_rows = 0
    
    def record(self, hit=False, rows=0):
        if hit:
            self.cache_hits += 1
        else:
            self.api_calls += 1
            self.cache_misses += 1
        self.total_rows += rows

    def get_stats(self):
        total = self.cache_hits + self.cache_misses
        ratio = (self.cache_hits / total * 100) if total > 0 else 0
        return {
            'api_calls': self.api_calls,
            'cache_hits': self.cache_hits,
            'hit_ratio': f"{ratio:.1f}%",
            'rows_fetched': self.total_rows
        }

# ==========================================
# PART 2: CACHING LAYER
# ==========================================

class DataCache:
    """Level 1: In-Memory LRU Cache"""
    def __init__(self, max_size=100):
        self.cache = {}
        self.max_size = max_size
    
    def get(self, key):
        if key in self.cache:
            # Simple LRU: move to end
            val = self.cache.pop(key)
            self.cache[key] = val
            return val['data']
        return None
    
    def put(self, key, value):
        if len(self.cache) >= self.max_size:
            self.cache.pop(next(iter(self.cache)))
        self.cache[key] = {
            'data': value,
            'timestamp': datetime.now()
        }

class SQLiteCache:
    """Level 2: Persistent SQLite Cache"""
    def __init__(self, db_path='market_data.db'):
        self.db_path = db_path
        self._init_db()
    
    def _get_conn(self):
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS ticker_data (
                    ticker TEXT,
                    interval TEXT,
                    timestamp TEXT,
                    open REAL, high REAL, low REAL, close REAL, volume INTEGER,
                    PRIMARY KEY (ticker, interval, timestamp)
                )
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_ticker_interval ON ticker_data (ticker, interval)
            ''')

    def get_latest_timestamp(self, ticker, interval):
        with self._get_conn() as conn:
            cursor = conn.execute(
                'SELECT MAX(timestamp) FROM ticker_data WHERE ticker=? AND interval=?', 
                (ticker, interval)
            )
            res = cursor.fetchone()
            return datetime.fromisoformat(res[0]) if res and res[0] else None

    def insert_data(self, ticker, interval, df):
        if df is None or df.empty:
            return
        
        # Convert index to string ISO format for storage
        df = df.copy()
        df.index = pd.to_datetime(df.index)
        
        data_tuples = []
        for ts, row in df.iterrows():
            data_tuples.append((
                ticker, 
                interval, 
                ts.isoformat(), 
                float(row['Open']), 
                float(row['High']), 
                float(row['Low']), 
                float(row['Close']), 
                int(row['Volume'])
            ))
            
        with self._get_conn() as conn:
            conn.executemany('''
                INSERT OR REPLACE INTO ticker_data 
                (ticker, interval, timestamp, open, high, low, close, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', data_tuples)
            
    def get_data(self, ticker, interval, start=None):
        query = 'SELECT timestamp, open, high, low, close, volume FROM ticker_data WHERE ticker=? AND interval=?'
        params = [ticker, interval]
        
        if start:
            query += ' AND timestamp >= ?'
            params.append(start.isoformat())
            
        query += ' ORDER BY timestamp ASC'
        
        with self._get_conn() as conn:
            df = pd.read_sql_query(query, conn, params=params, index_col='timestamp')
            
        if not df.empty:
            df.index = pd.to_datetime(df.index)
            df.columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            return df
        return None

# ==========================================
# PART 3: OPTIMIZATION ENGINE
# ==========================================

class OptimizationEngine:
    def __init__(self, session=None):
        self.mem_cache = DataCache(max_size=50)
        self.db_cache = SQLiteCache()
        self.rate_limiter = RateLimiter(requests_per_minute=20)
        self.metrics = DataFetchMetrics()
        self.session = session
        
        # Scheduler
        self.scheduler = BackgroundScheduler(timezone=pytz.timezone('Asia/Kolkata'))
        self.scheduler.start()
        logger.info("OptimizationEngine Scheduler Started (Asia/Kolkata)")
        
    def fetch_incremental(self, ticker, interval='1d', period='1mo'):
        """High-Watermark fetch strategy"""
        cache_key = f"{ticker}_{interval}"
        
        # 1. Check Memory
        cached = self.mem_cache.get(cache_key)
        if cached is not None:
            self.metrics.record(hit=True)
            return cached
            
        # 2. Check DB for latest timestamp
        last_update = self.db_cache.get_latest_timestamp(ticker, interval)
        
        start_date = None
        if last_update:
            # Incremental fetch
            start_date = last_update
            fetch_period = None 
        else:
            # Cold fetch
            fetch_period = period
            
        # 3. Fetch from API
        self.rate_limiter.wait_if_needed()
        try:
            # Using our custom session passed from yfinance_api
            ticker_obj = yf.Ticker(ticker, session=self.session)
            
            if start_date:
                # Add timezone info or handle it? yfinance returns tz-aware.
                # Just passing start date to history is usually fine.
                new_data = ticker_obj.history(start=start_date, interval=interval)
            else:
                new_data = ticker_obj.history(period=fetch_period, interval=interval)
                
            self.rate_limiter.record_success()
            
            if new_data.empty:
                # Return cached data if API returns nothing
                full_data = self.db_cache.get_data(ticker, interval)
                if full_data is not None:
                     self.mem_cache.put(cache_key, full_data)
                     return full_data
                return pd.DataFrame()

            # 4. Merge and Persist
            # If start_date was used, new_data has only recent rows.
            self.db_cache.insert_data(ticker, interval, new_data)
            self.metrics.record(hit=False, rows=len(new_data))
            
            # 5. Return Full Dataset (DB combined)
            full_data = self.db_cache.get_data(ticker, interval)
            self.mem_cache.put(cache_key, full_data)
            return full_data
            
        except Exception as e:
            logger.error(f"Fetch failed for {ticker}: {e}")
            if "Too Many Requests" in str(e):
                self.rate_limiter.record_rate_limit()
            
            # Fallback to DB
            return self.db_cache.get_data(ticker, interval)

    def fetch_concurrent(self, tickers, period='1d', interval='1d'):
        """Concurrent fetching using ThreadPoolExecutor"""
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(self.fetch_incremental, t, interval, period): t 
                for t in tickers
            }
            
            for future in concurrent.futures.as_completed(futures):
                t = futures[future]
                try:
                    data = future.result()
                    results[t] = data
                except Exception as e:
                    logger.error(f"Concurrent fetch error {t}: {e}")
        return results

    def schedule_market_updates(self, tickers: list):
        """Schedule automatic updates (as per guide)"""
        if not tickers:
            return
            
        # Hourly during market (approximate hours for NSE)
        self.scheduler.add_job(
            self.fetch_concurrent,
            'cron',
            hour='9-16',
            minute=30,
            args=[tickers, '1d', '1d'],
            id='hourly_update',
            replace_existing=True
        )
        logger.info(f"Scheduled updates for {len(tickers)} tickers")

# Global Instance placeholder
engine = None

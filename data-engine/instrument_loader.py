"""
Instrument Master Loader
Fetches the Open API Scrip Master from Angel One and populates Redis/MongoDB.
Enables support for ALL Indian stocks (NSE/BSE).
"""

import requests
import json
import redis
import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

# Configuration
ANGEL_ONE_SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/paper_trading')

def get_redis_client():
    return redis.from_url(REDIS_URL, decode_responses=True)

def get_mongo_collection():
    client = MongoClient(MONGO_URL)
    db = client.get_database()
    return db.instruments

def fetch_and_load_instruments():
    logger.info("⬇️ Fetching Scrip Master from Angel One...")
    try:
        response = requests.get(ANGEL_ONE_SCRIP_MASTER_URL)
        if response.status_code != 200:
            logger.error(f"Failed to fetch scrip master: HTTP {response.status_code}")
            return False
            
        instruments = response.json()
        logger.info(f"✅ Fetched {len(instruments)} instruments. Processing...")
        
        # Connect to DBs
        try:
            redis_client = get_redis_client()
            redis_client.ping()
            redis_available = True
            logger.info("✅ Redis connection established")
        except Exception:
            redis_available = False
            logger.warning("⚠️ Redis not available. Skipping cache population (Trading lookup will be slower)")

        mongo_collection = get_mongo_collection()
        
        # Prepare data
        mongo_docs = []
        if redis_available:
            redis_pipeline = redis_client.pipeline()
        
        count = 0
        
        # Filter for Equity (NSE/BSE) only for now to keep it lean
        # Angel format: {"token": "123", "symbol": "SBIN-EQ", "name": "SBIN", "exch_seg": "NSE", ...}
        
        for instr in instruments:
            # We are intereseted in NSE Equity usually for paper trading MVP
            # 'exch_seg' keys: 'NSE', 'BSE'
            exchange = instr.get('exch_seg')
            if exchange not in ['NSE', 'BSE']:
                continue
                
            # Only valid symbols ending with -EQ often denote equity shares in Angel terminology
            symbol_name = instr.get('symbol', '')
            
            # Use 'name' field for the clean symbol (e.g., 'RELIANCE')
            clean_symbol = instr.get('name', '').upper()
            token = instr.get('token')
            
            if not clean_symbol or not token:
                continue

            # Creating a simplified record
            record = {
                'symbol': clean_symbol,
                'token': token,
                'exchange': exchange,
                'lot_size': instr.get('lotsize', 1),
                'instrument_type': instr.get('instrumenttype', 'EQUITY'),
                'tick_size': instr.get('tick_size', 0.05)
            }
            
            # Redis: SYMBOL mapping -> JSON string for fast adapter lookup
            if redis_available:
                # Key format: "instrument:NSE:RELIANCE"
                redis_key = f"instrument:{exchange}:{clean_symbol}"
                redis_pipeline.set(redis_key, json.dumps(record))
                
                # Also simple token lookup: "token:NSE:RELIANCE" -> "2885"
                redis_pipeline.set(f"token:{exchange}:{clean_symbol}", token)
            
            # MongoDB: For searching/autocomplete
            mongo_docs.append(record)
            count += 1
            
            if count % 5000 == 0:
                if redis_available:
                    redis_pipeline.execute()
                    redis_pipeline = redis_client.pipeline()
                logger.info(f"Processed {count} records...")

        # Final execute
        if redis_available:
            redis_pipeline.execute()
        
        # MongoDB Bulk Insert (Rewrite collection)
        logger.info("💾 Saving to MongoDB (this might take a moment)...")
        mongo_collection.delete_many({}) # Clear old
        if mongo_docs:
            mongo_collection.insert_many(mongo_docs)
            
            # Create indexes for fast search
            mongo_collection.create_index("symbol")
            mongo_collection.create_index([("symbol", "text"), ("name", "text")])
            
        logger.info(f"✅ Successfully loaded {count} instruments into Redis and MongoDB")
        return True

    except Exception as e:
        logger.exception(f"❌ Error loading instruments: {e}")
        return False

if __name__ == "__main__":
    fetch_and_load_instruments()

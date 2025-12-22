import yfinance as yf
import json
import os
import pandas as pd
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_FILE = os.path.join(BASE_DIR, 'symbols.json')
OUTPUT_FILE = os.path.join(BASE_DIR, 'data', 'nse_history.json')
DATA_DIR = os.path.join(BASE_DIR, 'data')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def load_symbols():
    with open(SYMBOLS_FILE, 'r') as f:
        data = json.load(f)
    return list(data.get('symbols', {}).keys())

def fetch_data():
    symbols = load_symbols()
    print(f"Fetching data for {len(symbols)} symbols...")
    
    database = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "period": "6mo",
            "interval": "1d"
        },
        "data": {}
    }

    for symbol in symbols:
        try:
            yf_ticker = f"{symbol}.NS"
            print(f"Downloading {yf_ticker}...")
            
            # Fetch 6mo daily data
            ticker = yf.Ticker(yf_ticker)
            history = ticker.history(period="6mo", interval="1d")
            
            # Reset index to make Date a column
            history.reset_index(inplace=True)
            
            # Format dates to string
            history['Date'] = history['Date'].astype(str)
            
            # Convert to list of dicts
            records = history.to_dict('records')
            
            # Clean keys (optional, keep Title Case for consistency with yfinance)
            cleaned_records = []
            for record in records:
                cleaned_records.append({
                    "Date": record['Date'],
                    "Open": record['Open'],
                    "High": record['High'],
                    "Low": record['Low'],
                    "Close": record['Close'],
                    "Volume": record['Volume']
                })

            database["data"][symbol] = cleaned_records
            print(f"  > Saved {len(cleaned_records)} records.")
            
        except Exception as e:
            print(f"  ! Error fetching {symbol}: {e}")

    # Save to JSON
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(database, f, indent=2)
    
    print(f"\nDatabase successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    fetch_data()

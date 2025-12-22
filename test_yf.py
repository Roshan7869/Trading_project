import yfinance as yf
import requests_cache
import requests

# Configure session to avoid 429
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

def test_ticker(symbol):
    print(f"Testing {symbol} with custom session...")
    try:
        # Pass session to Ticker
        ticker = yf.Ticker(symbol, session=session)
        
        # Try fetching history
        hist = ticker.history(period="1mo")
        if hist.empty:
            print(f"❌ No history found for {symbol}")
        else:
            print(f"✅ Success! Fetched {len(hist)} rows for {symbol} (Last: {hist.index[-1]})")
            print(hist.tail(1)[['Close', 'Volume']])
            
    except Exception as e:
        print(f"❌ Error fetching {symbol}: {e}")

if __name__ == "__main__":
    print("--- YFinance Indian Market Test (Session Fix) ---")
    test_ticker("RELIANCE.NS")
    test_ticker("TCS.NS")

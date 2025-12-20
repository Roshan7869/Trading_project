# How to Use "All Indian Shares" Support

You have successfully upgraded your platform to support dynamic loading of all Indian stocks. Here is how to execute and use this feature.

## Prerequisite: Database Setup
This feature requires your local databases to be running to store the 50,000+ instrument records.
1.  **MongoDB**: Must be running on port `27017`.
2.  **Redis**: Must be running on port `6379`.

## Step 1: Load the Instrument Master
You need to run this script **once per day** (e.g., in the morning) to fetch the latest tokens from Angel One.

```bash
# Open a terminal in your project root
python data-engine/instrument_loader.py
```

**Success Output:**
> ✅ Fetched 50000+ instruments...
> ✅ Successfully loaded instruments into Redis and MongoDB

## Step 2: Verify the API
Once the data is loaded, you can test if the backend can find a stock that WAS NOT in your hardcoded list (e.g., `ZOMATO`).

1.  Start your backend: `npm run dev` (in `backend-express`)
2.  Visit in browser: `http://localhost:4000/api/market/search?query=ZOMATO`
3.  You should see a JSON response with the token and symbol.

## Step 3: Start Trading
1.  Run the Data Engine: `python main.py` (in `data-engine`)
2.  The engine will now successfully subscribe to any symbol found in the database, not just the hardcoded ones.

## Troubleshooting
*   **"Redis not available"**: The script will fall back to MongoDB. Trading will work, but looking up tokens might be slightly slower (~10ms vs ~1ms).
*   **"Symbol not found"**: Ensure you re-ran the loader script today.

export interface IMarketData {
    symbol: string;
    price: number;
    change: number;
    timestamp: string;
    volume: number;
    source: string;
    todayHigh?: number;
    todayLow?: number;
    todayOpen?: number;
}

export interface ICandle {
    x: number;  // Timestamp (ms) - start of candle period
    o: number;  // Open
    h: number;  // High
    l: number;  // Low
    c: number;  // Close
    v: number;  // Volume
}

// Timeframe in milliseconds
const TIMEFRAMES: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
};

export class MarketDataService {
    private cache: Map<string, IMarketData> = new Map();
    private candleCache: Map<string, ICandle[]> = new Map(); // symbol -> candles
    private currentCandle: Map<string, ICandle> = new Map(); // symbol -> current building candle
    private readonly maxCandles = 500; // Keep last 500 candles per symbol
    private readonly defaultTimeframe = '1m';

    public updatePrice(data: IMarketData) {
        // Track daily metrics
        const prevData = this.cache.get(data.symbol);

        if (!prevData) {
            data.todayHigh = data.price;
            data.todayLow = data.price;
            data.todayOpen = data.price;
        } else {
            data.todayHigh = Math.max(prevData.todayHigh ?? data.price, data.price);
            data.todayLow = Math.min(prevData.todayLow ?? data.price, data.price);
            data.todayOpen = prevData.todayOpen ?? data.price;
        }

        this.cache.set(data.symbol, data);
        this.processTick(data);
    }

    /**
     * Process incoming tick and aggregate into OHLC candles
     */
    private processTick(tick: IMarketData): void {
        const symbol = tick.symbol;
        const timeframeMs = TIMEFRAMES[this.defaultTimeframe];
        const tickTime = new Date(tick.timestamp).getTime();
        const candleStartTime = Math.floor(tickTime / timeframeMs) * timeframeMs;

        // Initialize candle storage for symbol if not exists
        if (!this.candleCache.has(symbol)) {
            this.candleCache.set(symbol, []);
        }

        const currentCandle = this.currentCandle.get(symbol);

        // Check if we need to start a new candle
        if (!currentCandle || currentCandle.x !== candleStartTime) {
            // Close the previous candle if it exists
            if (currentCandle) {
                const candles = this.candleCache.get(symbol)!;
                candles.push({ ...currentCandle });

                // Trim to max candles
                if (candles.length > this.maxCandles) {
                    candles.shift();
                }
            }

            // Start a new candle
            const newCandle: ICandle = {
                x: candleStartTime,
                o: tick.price,
                h: tick.price,
                l: tick.price,
                c: tick.price,
                v: tick.volume
            };
            this.currentCandle.set(symbol, newCandle);
        } else {
            // Update the current candle
            currentCandle.h = Math.max(currentCandle.h, tick.price);
            currentCandle.l = Math.min(currentCandle.l, tick.price);
            currentCandle.c = tick.price;
            currentCandle.v += tick.volume;
        }
    }

    /**
     * Get historical candles for a symbol
     */
    public getCandles(symbol: string, limit: number = 100): ICandle[] {
        const closedCandles = this.candleCache.get(symbol) || [];
        const current = this.currentCandle.get(symbol);

        // Combine closed candles with current building candle
        const allCandles = current ? [...closedCandles, current] : closedCandles;

        // Return last N candles
        return allCandles.slice(-limit);
    }

    /**
     * Get the current building candle for a symbol
     */
    public getCurrentCandle(symbol: string): ICandle | undefined {
        return this.currentCandle.get(symbol);
    }

    public getPrice(symbol: string): IMarketData | undefined {
        return this.cache.get(symbol);
    }

    public getAllPrices(): IMarketData[] {
        return Array.from(this.cache.values());
    }
}

export const marketDataService = new MarketDataService();

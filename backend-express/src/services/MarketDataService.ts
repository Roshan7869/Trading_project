export interface IMarketData {
    symbol: string;
    price: number;
    change: number;
    timestamp: string;
    volume: number;
    source: string;
}

export class MarketDataService {
    private cache: Map<string, IMarketData> = new Map();

    public updatePrice(data: IMarketData) {
        this.cache.set(data.symbol, data);
    }

    public getPrice(symbol: string): IMarketData | undefined {
        return this.cache.get(symbol);
    }

    public getAllPrices(): IMarketData[] {
        return Array.from(this.cache.values());
    }
}

export const marketDataService = new MarketDataService();

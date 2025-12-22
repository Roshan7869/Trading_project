'use client';

interface StockHoldingsProps {
    holdings: number;
    price: number;
}

export default function StockHoldings({ holdings, price }: StockHoldingsProps) {
    if (holdings <= 0) return null;

    return (
        <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 mt-6">
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-3">Your Portfolio Exposure</h3>
            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-white">{holdings} Shares</span>
                <span className="text-xl font-bold text-blue-400">
                    ₹{(holdings * price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
}

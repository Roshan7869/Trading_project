'use client';

interface StockHoldingsProps {
    holdings: number;
    price: number;
}

export default function StockHoldings({ holdings, price }: StockHoldingsProps) {
    if (holdings <= 0) return null;

    return (
        <div className="bg-secondary p-6 rounded-xl border border-gray-200 mt-6">
            <p className="text-gray-600 mb-2">Your Holdings</p>
            <p className="text-2xl font-bold text-gray-900">
                {holdings} shares
                <span className="text-lg text-gray-600 ml-2">
                    (₹{(holdings * price).toLocaleString('en-IN', { maximumFractionDigits: 2 })})
                </span>
            </p>
        </div>
    );
}

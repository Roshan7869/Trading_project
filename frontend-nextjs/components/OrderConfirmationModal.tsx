'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OrderConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    totalAmount: number;
    holdings?: number;
}

export default function OrderConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    symbol,
    side,
    quantity,
    price,
    totalAmount,
    holdings = 0,
}: OrderConfirmationProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const isRisky = side === 'BUY' && totalAmount > 50000;
    const insufficientHoldings = side === 'SELL' && quantity > holdings;

    const handleConfirm = async () => {
        try {
            setIsConfirming(true);
            await onConfirm();
            setIsConfirmed(true);
            setTimeout(() => {
                setIsConfirmed(false);
                onClose();
            }, 2000);
        } catch (error) {
            // Error handling is done by parent usually, but we stop loading here
            setIsConfirming(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                {!isConfirmed ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {isRisky && <AlertCircle className="w-5 h-5 text-amber-500" />}
                                Confirm Order
                            </DialogTitle>
                            <DialogDescription>
                                Please review your order details before placing.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="rounded-lg border bg-secondary/50 p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Symbol</span>
                                    <span className="font-semibold">{symbol}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Type</span>
                                    <span className={`font-semibold ${side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                                        {side}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Quantity</span>
                                    <span className="font-semibold">{quantity}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Price</span>
                                    <span className="font-semibold">₹{price.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="border-t my-2 pt-2 flex justify-between items-center font-bold">
                                    <span>Total</span>
                                    <span>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Risk Warnings */}
                            {insufficientHoldings && (
                                <div className="rounded-md bg-destructive/15 text-destructive p-3 text-sm flex gap-2 items-center">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>You only have {holdings} shares. Order may fail.</span>
                                </div>
                            )}

                            {isRisky && (
                                <div className="rounded-md bg-amber-500/15 text-amber-600 p-3 text-sm flex gap-2 items-center">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>This is a high-value trade. Confirm details carefully.</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onClose}
                                disabled={isConfirming}
                                className="px-4 py-2 rounded-md hover:bg-secondary transition font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isConfirming || insufficientHoldings}
                                className={`px-4 py-2 rounded-md text-white font-medium text-sm transition flex items-center gap-2 ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {isConfirming ? 'Processing...' : `Confirm ${side}`}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500 animate-in zoom-in duration-300" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Order Placed!</h3>
                            <p className="text-muted-foreground mt-1">Your order has been sent to the exchange.</p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

import { useEffect } from 'react';
import { useMarket } from '@/context/MarketContext';
import { toast } from 'sonner';

export interface Order {
    _id: string;
    orderId: string;
    symbolName: string;
    transactionType: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
    executionDetails?: {
        executedPrice: number;
        executedAt: string;
    }
    createdAt: string;
}

export function useOrderUpdates(onOrderUpdate?: (order: Order) => void) {
    const { socket } = useMarket();

    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = (order: Order) => {
            console.log('Order update received:', order);

            if (order.status === 'EXECUTED') {
                toast.success(`Order Executed: ${order.transactionType} ${order.symbolName} @ ₹${order.executionDetails?.executedPrice}`);
            } else if (order.status === 'REJECTED') {
                toast.error(`Order Rejected: ${order.symbolName}`);
            } else if (order.status === 'CANCELLED') {
                toast.info(`Order Cancelled: ${order.symbolName}`);
            }

            if (onOrderUpdate) {
                onOrderUpdate(order);
            }
        };

        socket.on('order:updated', handleOrderUpdate);

        return () => {
            socket.off('order:updated', handleOrderUpdate);
        };
    }, [socket, onOrderUpdate]);
}

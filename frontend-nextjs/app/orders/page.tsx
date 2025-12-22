'use client'

import { useEffect, useState } from 'react'
import { orderAPI } from '@/lib/api'
import { TrendingUp, TrendingDown, CheckCircle, Clock, XCircle, Ban, Trash2 } from 'lucide-react'
import { useOrderUpdates } from '@/hooks/useOrderUpdates'
import { OrdersTableSkeleton } from '@/components/Skeletons'
import ClientDate from '@/components/ClientDate'
import { toast } from 'sonner'

interface Order {
    id: string
    symbol: string
    type: 'BUY' | 'SELL'
    orderType: 'MARKET' | 'LIMIT'
    quantity: number
    price: number
    totalAmount: number
    status: string
    timestamp: string
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // Listen for live updates
    useOrderUpdates((updatedOrder) => {
        setOrders((prev) => {
            const mappedOrder: Order = {
                id: updatedOrder.orderId || updatedOrder._id,
                symbol: updatedOrder.symbolName,
                type: updatedOrder.transactionType,
                orderType: updatedOrder.orderType || 'MARKET',
                quantity: updatedOrder.quantity,
                price: updatedOrder.executionDetails?.executedPrice || updatedOrder.price || 0,
                totalAmount: (updatedOrder.executionDetails?.executedPrice || updatedOrder.price || 0) * updatedOrder.quantity,
                status: updatedOrder.status,
                timestamp: updatedOrder.createdAt || new Date().toISOString()
            }

            // Update existing or add new to top
            const existingIndex = prev.findIndex(o => o.id === mappedOrder.id);
            if (existingIndex >= 0) {
                const newOrders = [...prev];
                newOrders[existingIndex] = mappedOrder;
                return newOrders;
            } else {
                return [mappedOrder, ...prev];
            }
        });
    });

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const response = await orderAPI.getHistory()
            setOrders(response.data.orders.map((o: any) => ({
                id: o.orderId || o._id,
                symbol: o.symbolName,
                type: o.transactionType,
                orderType: o.orderType || 'MARKET',
                quantity: o.quantity,
                price: o.executionDetails?.executedPrice || o.price || 0,
                totalAmount: (o.executionDetails?.executedPrice || o.price || 0) * o.quantity,
                status: o.status,
                timestamp: o.createdAt
            })))
        } catch (error) {
            console.error('Failed to fetch orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCancelOrder = async (orderId: string) => {
        try {
            const promise = orderAPI.cancelOrder(orderId);
            toast.promise(promise, {
                loading: 'Cancelling order...',
                success: 'Order cancelled successfully',
                error: 'Failed to cancel order'
            });
            await promise;
            fetchOrders();
        } catch (error) {
            console.error(error);
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'EXECUTED': return <CheckCircle className="h-4 w-4 text-primary" />
            case 'PENDING': return <Clock className="h-4 w-4 text-amber-500" />
            case 'REJECTED': return <Ban className="h-4 w-4 text-danger" />
            case 'CANCELLED': return <XCircle className="h-4 w-4 text-gray-500" />
            default: return <CheckCircle className="h-4 w-4" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'EXECUTED': return 'text-primary'
            case 'PENDING': return 'text-amber-500'
            case 'REJECTED': return 'text-danger'
            case 'CANCELLED': return 'text-gray-500'
            default: return 'text-gray-900'
        }
    }

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>
                <OrdersTableSkeleton />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-600">No orders yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Your order history will appear here
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Symbol</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Qty</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Price</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Value</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Time</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order, index) => (
                                    <tr key={order.id || index} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900">{order.symbol}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span
                                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${order.type === 'BUY'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                        }`}
                                                >
                                                    {order.type === 'BUY' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                    <span>{order.type}</span>
                                                </span>
                                                <span className="text-xs font-semibold text-gray-500 px-2 uppercase">{order.orderType}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-medium">
                                            {order.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">
                                            ₹{(order.price ?? 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ₹{(order.totalAmount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                                                {getStatusIcon(order.status)}
                                                <span className="text-sm font-medium">{order.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                                            <ClientDate date={order.timestamp} format="relative" />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {order.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors tooltip tooltip-left"
                                                    title="Cancel Order"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
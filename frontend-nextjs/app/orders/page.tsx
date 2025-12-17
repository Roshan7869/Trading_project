'use client'

import { useEffect, useState } from 'react'
import { orderAPI } from '@/lib/api'
import { TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'

interface Order {
    id: string
    symbol: string
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    totalAmount: number
    status: string
    timestamp: string
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const response = await orderAPI.getHistory()
            setOrders(response.data.orders)
        } catch (error) {
            console.error('Failed to fetch orders:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading orders...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <p className="text-gray-600">No orders yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Your order history will appear here
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                        Symbol
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                        Quantity
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                        Price
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                        Total Amount
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-secondary/50 transition">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900">{order.symbol}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${order.type === 'BUY'
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-danger/10 text-danger'
                                                    }`}
                                            >
                                                {order.type === 'BUY' ? (
                                                    <TrendingUp className="h-4 w-4" />
                                                ) : (
                                                    <TrendingDown className="h-4 w-4" />
                                                )}
                                                <span>{order.type}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">
                                            {order.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">
                                            ₹{order.price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                            ₹{order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center space-x-1 text-primary">
                                                <CheckCircle className="h-4 w-4" />
                                                <span className="text-sm">{order.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600">
                                            {new Date(order.timestamp).toLocaleString('en-IN', {
                                                dateStyle: 'short',
                                                timeStyle: 'short',
                                            })}
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
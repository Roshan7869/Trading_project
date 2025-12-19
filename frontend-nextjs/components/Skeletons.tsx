import { Skeleton } from "@/components/ui/skeleton"

export function WatchlistSkeleton() {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <Skeleton className="h-7 w-24" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                    <div className="space-y-2 mt-4">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="flex justify-between pt-4 mt-2">
                        <Skeleton className="h-8 w-24 rounded-lg" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function OrdersTableSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-4 w-24" />)}
            </div>
            <div className="p-0">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center px-6 py-4 border-b border-gray-50 last:border-0">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ChartSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4 h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-12 rounded-md" />)}
                </div>
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
    )
}

export function StockCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    )
}

export function SettingsSkeleton() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-96" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-14 w-full rounded-xl mt-6" />
            </div>
        </div>
    )
}

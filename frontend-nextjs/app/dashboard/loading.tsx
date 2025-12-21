import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm p-6 border space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Trade Skeleton */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border">
                        <Skeleton className="h-6 w-32 mb-4" />
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full rounded-lg" />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-full rounded-lg" />
                                <Skeleton className="h-10 w-full rounded-lg" />
                            </div>
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                    </div>

                    {/* Holdings Skeleton */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border lg:col-span-2">
                        <Skeleton className="h-6 w-32 mb-4" />
                        <div className="space-y-4">
                            <div className="bg-gray-50 h-10 w-full rounded-lg" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex justify-between items-center py-4 border-b">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Market Overview Skeleton */}
                <div className="mt-6 bg-white rounded-2xl shadow-sm p-6 border">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

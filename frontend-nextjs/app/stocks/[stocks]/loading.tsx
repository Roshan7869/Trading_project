import { ChartSkeleton, StockCardSkeleton } from "@/components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <Skeleton className="h-6 w-32" />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Stock Info Skeleton */}
                <div className="lg:col-span-2 space-y-8">
                    <StockCardSkeleton />
                    <ChartSkeleton />
                </div>

                {/* Order Form Skeleton */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <Skeleton className="h-8 w-48 mb-6" />
                        <div className="flex gap-2 mb-6">
                            <Skeleton className="h-12 flex-1 rounded-xl" />
                            <Skeleton className="h-12 flex-1 rounded-xl" />
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                        </div>
                        <Skeleton className="h-14 w-full rounded-full mt-6" />
                    </div>
                </div>
            </div>
        </div>
    );
}

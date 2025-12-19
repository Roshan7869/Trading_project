'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex h-[80vh] flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center max-w-md text-center space-y-4 bg-white p-8 rounded-2xl shadow-sm border">
                <div className="bg-red-50 p-3 rounded-full">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>
                <p className="text-gray-500">
                    {error.message || "An unexpected error occurred."}
                </p>
                <button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
                >
                    Try again
                </button>
            </div>
        </div>
    )
}

'use client'
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SignUp afterSignUpUrl="/dashboard" signInUrl="/login" />
            {/* CAPTCHA container for Clerk bot protection */}
            <div id="clerk-captcha" className="mt-4"></div>
        </div>
    );
}

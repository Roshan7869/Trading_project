'use client'
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SignIn afterSignInUrl="/dashboard" signUpUrl="/register" />
            {/* CAPTCHA container for Clerk bot protection */}
            <div id="clerk-captcha" className="mt-4"></div>
        </div>
    );
}

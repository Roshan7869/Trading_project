'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { userAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { MarketProvider } from '@/context/MarketContext';

interface User {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isClerkEnabled: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Demo user for development without Clerk
const DEMO_USER: User = {
    id: '000000000000000000000001',
    name: 'Demo User',
    email: 'demo@example.com',
    walletBalance: 100000,
};

export function AuthProviderDemo({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(DEMO_USER);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        console.log('🔓 Running in DEMO MODE (Clerk not configured)');
        console.log('   To enable authentication, set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
        fetchBackendProfile();
    }, []);

    const fetchBackendProfile = async () => {
        try {
            const response = await userAPI.getProfile();
            if (response.data) {
                setUser(response.data);
            }
        } catch (error: any) {
            // Use demo user on error
            console.log('Using demo user (backend auth not available)');
            setUser(DEMO_USER);
        }
    };

    const login = async () => {
        setUser(DEMO_USER);
        router.push('/dashboard');
    };

    const register = async () => {
        setUser(DEMO_USER);
        router.push('/dashboard');
    };

    const logout = async () => {
        setUser(null);
        router.push('/');
    };

    const refreshUser = async () => {
        await fetchBackendProfile();
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            refreshUser,
            isClerkEnabled: false,
        }}>
            <MarketProvider>
                {children}
            </MarketProvider>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

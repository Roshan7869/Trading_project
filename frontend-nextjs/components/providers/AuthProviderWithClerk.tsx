'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClerkProvider, useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
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

function AuthProviderInner({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const { signOut } = useClerkAuth();
    const router = useRouter();

    useEffect(() => {
        if (isClerkLoaded) {
            if (clerkUser) {
                fetchBackendProfile();
            } else {
                setUser(null);
                setProfileLoading(false);
            }
        }
    }, [isClerkLoaded, clerkUser]);

    const fetchBackendProfile = async (retries = 3) => {
        try {
            setProfileLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await userAPI.getProfile();
            setUser(response.data);
        } catch (error: any) {
            const status = error.response?.status;

            if (status === 401 && retries > 0) {
                console.log(`Auth not ready, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchBackendProfile(retries - 1);
            }

            if (status !== 401) {
                console.error('Failed to fetch user profile:', error);
            }
        } finally {
            setProfileLoading(false);
        }
    };

    const login = async () => {
        router.push('/login');
    };

    const register = async () => {
        router.push('/register');
    };

    const logout = async () => {
        await signOut();
        setUser(null);
        router.push('/login');
    };

    const refreshUser = async () => {
        await fetchBackendProfile();
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading: !isClerkLoaded || profileLoading,
            login,
            register,
            logout,
            refreshUser,
            isClerkEnabled: true,
        }}>
            <MarketProvider>
                {children}
            </MarketProvider>
        </AuthContext.Provider>
    );
}

export function AuthProviderWithClerk({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <AuthProviderInner>
                {children}
            </AuthProviderInner>
        </ClerkProvider>
    );
}

export const useAuth = () => useContext(AuthContext);

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { userAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';

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
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const { signOut } = useClerkAuth();
    const router = useRouter();

    useEffect(() => {
        if (isClerkLoaded) {
            if (clerkUser) {
                // User is signed in with Clerk, fetch backend profile
                fetchBackendProfile();
            } else {
                // User is not signed in
                setUser(null);
                setProfileLoading(false);
            }
        }
    }, [isClerkLoaded, clerkUser]);

    const fetchBackendProfile = async (retries = 3) => {
        try {
            setProfileLoading(true);
            // Small delay to ensure Clerk token is ready
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await userAPI.getProfile();
            setUser(response.data);
        } catch (error: any) {
            const status = error.response?.status;

            // Retry on 401 (token might not be ready yet)
            if (status === 401 && retries > 0) {
                console.log(`Auth not ready, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchBackendProfile(retries - 1);
            }

            // Only log unexpected errors
            if (status !== 401) {
                console.error('Failed to fetch user profile:', error);
            }
            // Don't auto-logout here as Clerk middleware handles auth state
        } finally {
            setProfileLoading(false);
        }
    };

    // Deprecated methods that just redirect or warn
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
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

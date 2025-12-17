'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

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
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await userAPI.getProfile();
                setUser(response.data);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await authAPI.login({ email, password });
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        router.push('/dashboard');
    };

    const register = async (name: string, email: string, password: string) => {
        const response = await authAPI.register({ name, email, password });
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        router.push('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        router.push('/login');
    };

    const refreshUser = async () => {
        await checkAuth();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

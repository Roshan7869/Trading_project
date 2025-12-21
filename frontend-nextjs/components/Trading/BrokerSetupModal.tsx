'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Shield, Zap, Globe, AlertCircle, Loader2, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Broker {
    name: string;
    displayName: string;
    logo: string;
    features: string[];
    requiredFields: string[];
    description?: string;
    color?: string;
}

interface BrokerSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (brokerName: string) => void;
}

const BROKER_INFO: Record<string, { description: string; color: string }> = {
    'KOTAK_NEO': {
        description: 'Zero-brokerage trading with ultra-low latency. Perfect for high-frequency traders.',
        color: 'bg-red-50'
    },
    'ANGEL_ONE': {
        description: 'Fast execution with easy API integration. Supports crypto trading.',
        color: 'bg-blue-50'
    },
    'ZERODHA_KITE': {
        description: "India's largest retail broker with extensive ecosystem and WebSocket support.",
        color: 'bg-orange-50'
    }
};

const FIELD_LABELS: Record<string, string> = {
    consumerKey: 'Consumer Key',
    consumerSecret: 'Consumer Secret',
    clientId: 'Client ID / UCC',
    mpin: 'MPIN (6-digit)',
    mobile: 'Registered Mobile',
    totpSecret: 'TOTP Secret (Base32)',
    clientCode: 'API Client Code',
    apiPassword: 'API Password',
    brokerApiKey: 'Broker API Key',
    apiKey: 'API Key',
    apiSecret: 'API Secret',
    password: 'Login Password'
};

export const BrokerSetupModal: React.FC<BrokerSetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'select' | 'credentials' | 'connecting' | 'success'>('select');
    const [availableBrokers, setAvailableBrokers] = useState<Broker[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchBrokers();
            setStep('select');
            setSelectedBroker(null);
            setCredentials({});
            setError(null);
        }
    }, [isOpen]);

    const fetchBrokers = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/broker/available`);
            const data = await response.json();
            setAvailableBrokers(data.brokers || []);
        } catch (err) {
            console.error('Failed to load brokers:', err);
            // Fallback data
            setAvailableBrokers([
                {
                    name: 'KOTAK_NEO',
                    displayName: 'Kotak Neo',
                    logo: '/brokers/kotak-neo.png',
                    features: ['Zero Brokerage', 'Ultra-Low Latency', 'NSE/BSE/NFO'],
                    requiredFields: ['consumerKey', 'consumerSecret', 'clientId', 'mpin', 'mobile', 'totpSecret']
                },
                {
                    name: 'ANGEL_ONE',
                    displayName: 'Angel One',
                    logo: '/brokers/angel-one.jpg',
                    features: ['Fast Execution', 'Bracket Orders', 'Crypto Trading'],
                    requiredFields: ['clientCode', 'apiPassword', 'brokerApiKey', 'totpSecret']
                },
                {
                    name: 'ZERODHA_KITE',
                    displayName: 'Zerodha Kite',
                    logo: '/brokers/zerodha.png',
                    features: ['Largest Broker', 'WebSocket Support', 'Rich Ecosystem'],
                    requiredFields: ['apiKey', 'apiSecret', 'clientId', 'password', 'totpSecret']
                }
            ]);
        }
    };

    const handleBrokerSelect = (broker: Broker) => {
        setSelectedBroker(broker);
        setCredentials({});
        setError(null);
        setStep('credentials');
    };

    const handleCredentialChange = (field: string, value: string) => {
        setCredentials(prev => ({ ...prev, [field]: value }));
    };

    const togglePasswordVisibility = (field: string) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const isPasswordField = (field: string) => {
        const lwField = field.toLowerCase();
        return lwField.includes('password') || lwField.includes('secret') || lwField.includes('pin') || lwField.includes('mpin');
    };

    const validateCredentials = () => {
        if (!selectedBroker) return false;
        return selectedBroker.requiredFields.every(field => credentials[field]?.trim());
    };

    const handleConnect = async () => {
        if (!validateCredentials()) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setStep('connecting');
        setError(null);

        try {
            const userId = localStorage.getItem('userId') || 'guest_user';

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/broker/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    brokerName: selectedBroker?.name,
                    credentials
                })
            });

            const data = await response.json();

            if (data.success) {
                setStep('success');
                setTimeout(() => {
                    onSuccess(selectedBroker!.name);
                    onClose();
                }, 2000);
            } else {
                setError(data.message || 'Connection failed. Please check your credentials.');
                setStep('credentials');
            }
        } catch (err: any) {
            console.error('Connection failed:', err);
            setError('Network error. Please check your connection and try again.');
            setStep('credentials');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const brokerInfo = selectedBroker ? BROKER_INFO[selectedBroker.name] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Shield className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Connect Your Broker</h2>
                                <p className="text-sm text-gray-500">Secure API Integration</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mt-6">
                        {['Select Broker', 'Enter Credentials', 'Connect'].map((label, idx) => {
                            const stepNum = idx + 1;
                            const isActive =
                                (step === 'select' && stepNum === 1) ||
                                (step === 'credentials' && stepNum === 2) ||
                                ((step === 'connecting' || step === 'success') && stepNum === 3);
                            const isCompleted =
                                (step === 'credentials' && stepNum === 1) ||
                                ((step === 'connecting' || step === 'success') && stepNum <= 2);

                            return (
                                <React.Fragment key={label}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${isCompleted ? 'bg-emerald-500 text-white' :
                                                isActive ? 'bg-emerald-600 text-white' :
                                                    'bg-gray-100 text-gray-400'
                                            }`}>
                                            {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                                        </div>
                                        <span className={`text-sm hidden sm:block ${isActive ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                                            {label}
                                        </span>
                                    </div>
                                    {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Step 1: Broker Selection */}
                    {step === 'select' && (
                        <div className="space-y-4">
                            <p className="text-gray-600 mb-6">
                                Choose your preferred broker to connect and start trading with real market data.
                            </p>
                            <div className="grid gap-4">
                                {availableBrokers.map(broker => {
                                    const info = BROKER_INFO[broker.name];
                                    return (
                                        <button
                                            key={broker.name}
                                            onClick={() => handleBrokerSelect(broker)}
                                            className="group relative p-4 bg-white border border-gray-200 hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 rounded-xl transition-all duration-200 text-left"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-16 flex items-center justify-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                    <img
                                                        src={broker.logo}
                                                        alt={broker.displayName}
                                                        className="w-full h-full object-contain mix-blend-multiply"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                                        {broker.displayName}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {info?.description || 'Trading platform integration'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {broker.features.map(feature => (
                                                            <span key={feature} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 font-medium rounded-full border border-gray-200">
                                                                {feature}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Credentials Form */}
                    {step === 'credentials' && selectedBroker && (
                        <div className="space-y-6">
                            {/* Broker Header */}
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-center">
                                    <img
                                        src={selectedBroker.logo}
                                        alt={selectedBroker.displayName}
                                        className="w-full h-full object-contain mix-blend-multiply"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{selectedBroker.displayName}</h3>
                                    <p className="text-sm text-gray-500">Enter your API credentials</p>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            {/* Credential Fields */}
                            <div className="space-y-4">
                                {selectedBroker.requiredFields.map(field => (
                                    <div key={field} className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">
                                            {FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').trim()}
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={isPasswordField(field) && !showPasswords[field] ? 'password' : 'text'}
                                                placeholder={`Enter ${FIELD_LABELS[field] || field}`}
                                                value={credentials[field] || ''}
                                                onChange={(e) => handleCredentialChange(field, e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-gray-900 placeholder-gray-400 transition-all pr-12"
                                            />
                                            {isPasswordField(field) && (
                                                <button
                                                    type="button"
                                                    onClick={() => togglePasswordVisibility(field)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    {showPasswords[field] ?
                                                        <EyeOff className="w-5 h-5" /> :
                                                        <Eye className="w-5 h-5" />
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Security Note */}
                            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-emerald-800 leading-relaxed">
                                    Your credentials are encrypted using <strong>AES-256</strong> bank-grade encryption. We never share your keys with third parties and they are only used to execute trades on your behalf.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStep('select')}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleConnect}
                                    disabled={!validateCredentials()}
                                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                                >
                                    <Zap className="w-4 h-4" />
                                    Connect Broker
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Connecting */}
                    {step === 'connecting' && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-full mb-6">
                                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Connecting to {selectedBroker?.displayName}</h3>
                            <p className="text-gray-500">Authenticating your credentials & creating session...</p>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Successfully Connected!</h3>
                            <p className="text-gray-500">
                                Your {selectedBroker?.displayName} account is now linked.
                                Redirecting to trading dashboard...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrokerSetupModal;

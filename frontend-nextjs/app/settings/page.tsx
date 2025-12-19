'use client'

import { useState, useEffect } from 'react'
import { Settings, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { settingsAPI } from '@/lib/api'
import { SettingsSkeleton } from '@/components/Skeletons'

interface BrokerInfo {
    id: string
    name: string
    description: string
    requiredFields: string[]
    fieldLabels: Record<string, string>
}

interface BrokerConfig {
    configured: boolean
    activeBroker: string | null
    connection?: {
        broker: string
        apiKey: string
        clientCode?: string
        mobileNumber?: string
        userId?: string
        isActive: boolean
        connectedAt?: string
    }
}

export default function SettingsPage() {
    const [brokers, setBrokers] = useState<BrokerInfo[]>([])
    const [currentConfig, setCurrentConfig] = useState<BrokerConfig | null>(null)
    const [selectedBroker, setSelectedBroker] = useState<string>('')
    const [credentials, setCredentials] = useState<Record<string, string>>({})
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchBrokers()
        fetchCurrentConfig()
    }, [])

    const fetchBrokers = async () => {
        try {
            const response = await settingsAPI.getBrokers()
            setBrokers(response.data.brokers)
        } catch (error) {
            console.error('Failed to fetch brokers:', error)
        }
    }

    const fetchCurrentConfig = async () => {
        try {
            const response = await settingsAPI.getBrokerConfig()
            setCurrentConfig(response.data)
            if (response.data.activeBroker) {
                setSelectedBroker(response.data.activeBroker)
            }
        } catch (error) {
            console.error('Failed to fetch config:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleBrokerSelect = (brokerId: string) => {
        setSelectedBroker(brokerId)
        setCredentials({})
        setMessage(null)
    }

    const handleInputChange = (field: string, value: string) => {
        setCredentials(prev => ({ ...prev, [field]: value }))
    }

    const toggleShowSecret = (field: string) => {
        setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)

        try {
            const response = await settingsAPI.saveBrokerConfig({
                broker: selectedBroker,
                ...credentials
            })

            if (response.data.success) {
                setMessage({ type: 'success', text: response.data.message || 'Configuration saved successfully!' })
                fetchCurrentConfig()
            } else {
                setMessage({ type: 'error', text: response.data.message || 'Failed to save configuration' })
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save broker configuration' })
        } finally {
            setSaving(false)
        }
    }

    const selectedBrokerInfo = brokers.find(b => b.id === selectedBroker)
    const isSecretField = (field: string) =>
        ['apiSecret', 'pin', 'totpSecret', 'consumerSecret', 'password'].includes(field)



    if (loading) {
        return <SettingsSkeleton />
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Settings className="h-8 w-8 text-emerald-600" />
                    Broker Configuration
                </h1>
                <p className="text-gray-600 mt-2">Connect your brokerage account to stream live market data</p>
            </div>

            {/* Multi-User Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-800">Your credentials are securely encrypted</p>
                        <p className="text-sm text-blue-600 mt-1">
                            Each user can connect their own broker account. Your API keys are encrypted
                            and stored separately from other users. The platform supports multiple brokers
                            (Angel One, Zerodha, Kotak Neo) simultaneously.
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Status */}
            {currentConfig?.configured && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800">
                            Connected to {currentConfig.activeBroker?.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-green-600">
                            API Key: {currentConfig.connection?.apiKey || 'N/A'}
                        </p>
                    </div>
                </div>
            )}

            {/* Broker Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    Select Your Brokerage
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {brokers.map(broker => (
                        <button
                            key={broker.id}
                            onClick={() => handleBrokerSelect(broker.id)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${selectedBroker === broker.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <h3 className="font-semibold text-gray-900">{broker.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{broker.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Credential Form */}
            {selectedBrokerInfo && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {selectedBrokerInfo.name} Credentials
                    </h2>

                    <div className="space-y-4">
                        {selectedBrokerInfo.requiredFields.map(field => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {selectedBrokerInfo.fieldLabels[field]}
                                </label>
                                <div className="relative">
                                    <input
                                        type={isSecretField(field) && !showSecrets[field] ? 'password' : 'text'}
                                        value={credentials[field] || ''}
                                        onChange={(e) => handleInputChange(field, e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        placeholder={`Enter your ${selectedBrokerInfo.fieldLabels[field]}`}
                                    />
                                    {isSecretField(field) && (
                                        <button
                                            type="button"
                                            onClick={() => toggleShowSecret(field)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showSecrets[field] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="h-5 w-5" />
                            ) : (
                                <AlertCircle className="h-5 w-5" />
                            )}
                            {message.text}
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || selectedBrokerInfo.requiredFields.some(f => !credentials[f])}
                        className="mt-6 w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>

                    <p className="mt-4 text-sm text-gray-500 text-center">
                        Your credentials are encrypted and stored securely.
                    </p>
                </div>
            )}
        </div>
    )
}

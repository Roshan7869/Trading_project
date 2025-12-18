'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { data } = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      })

      // Store token
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            Create Account
          </h1>
          <p className="text-gray-400">Join the future of paper trading</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
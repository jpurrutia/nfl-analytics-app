'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useAuthStore } from '@/lib/auth-store'
import { useState } from 'react'
import Cookies from 'js-cookie'

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const authStore = useAuthStore()
  const [email, setEmail] = useState('testuser@example.com')
  const [password, setPassword] = useState('TestPassword123!')
  
  const handleLogin = async () => {
    try {
      await authStore.login(email, password)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }
  
  const handleCheckAuth = async () => {
    await authStore.checkAuth()
  }
  
  const getCookies = () => {
    const accessToken = Cookies.get('access_token')
    const refreshToken = Cookies.get('refresh_token')
    console.log('Cookies:', { accessToken: !!accessToken, refreshToken: !!refreshToken })
    return { accessToken, refreshToken }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold">Current State:</h2>
          <pre className="mt-2 text-sm">
            {JSON.stringify({
              isAuthenticated,
              isLoading,
              user
            }, null, 2)}
          </pre>
        </div>
        
        <div className="p-4 bg-blue-50 rounded">
          <h2 className="font-semibold mb-2">Test Login:</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full p-2 border rounded mb-2"
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full p-2 border rounded mb-2"
            placeholder="Password"
          />
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Login
          </button>
          <button
            onClick={handleCheckAuth}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
          >
            Check Auth
          </button>
          <button
            onClick={() => {
              authStore.logout()
            }}
            className="bg-red-500 text-white px-4 py-2 rounded mr-2"
          >
            Logout
          </button>
          <button
            onClick={getCookies}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Check Cookies
          </button>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded">
          <h2 className="font-semibold">Instructions:</h2>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Click "Check Cookies" to see if cookies are set</li>
            <li>Click "Login" to authenticate</li>
            <li>Check console for debug output</li>
            <li>Refresh page to test persistence</li>
            <li>Click "Check Auth" to verify token</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
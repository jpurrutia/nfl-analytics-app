'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import ESPNConnect from '@/components/leagues/ESPNConnect'
import toast from 'react-hot-toast'

export default function ConnectLeaguePage() {
  const router = useRouter()
  const { user } = useAuth()

  const handleESPNConnect = async (leagueId: string, swid: string, espnS2: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:8080/api/leagues/espn/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          league_id: leagueId,
          swid: swid,
          espn_s2: espnS2,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to connect ESPN league')
      }

      const data = await response.json()
      toast.success(data.message || 'ESPN league connected successfully!')
      
      // Redirect to leagues page
      router.push('/leagues')
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to ESPN')
      throw error
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Connect Your League</h1>
          <p className="mt-2 text-gray-600">
            Import your ESPN Fantasy Football league to track your team's performance
          </p>
        </div>

        <ESPNConnect onConnect={handleESPNConnect} />

        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Why connect your ESPN league?</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Real-time sync with your ESPN Fantasy league</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Advanced analytics and insights for your team</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>AI-powered draft recommendations</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Automated lineup optimization</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
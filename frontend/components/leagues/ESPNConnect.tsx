'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ExternalLink, Info, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react'

interface ESPNConnectProps {
  onConnect: (leagueId: string, swid: string, espnS2: string) => Promise<void>
}

export default function ESPNConnect({ onConnect }: ESPNConnectProps) {
  const [leagueId, setLeagueId] = useState('')
  const [swid, setSwid] = useState('')
  const [espnS2, setEspnS2] = useState('')
  const [showTokens, setShowTokens] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)
  const [step, setStep] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await onConnect(leagueId, swid, espnS2)
    } catch (err: any) {
      setError(err.message || 'Failed to connect to ESPN league')
    } finally {
      setLoading(false)
    }
  }

  const instructions = [
    {
      title: '1. Open ESPN Fantasy Football',
      description: 'Go to fantasy.espn.com and log into your account',
      detail: 'Make sure you\'re logged into the account that has access to your league.'
    },
    {
      title: '2. Open Developer Tools',
      description: 'Press F12 (Windows) or Cmd+Option+I (Mac)',
      detail: 'This opens your browser\'s developer tools. Don\'t worry, we\'re just looking at cookies!'
    },
    {
      title: '3. Go to Application/Storage Tab',
      description: 'Click on "Application" (Chrome) or "Storage" (Firefox)',
      detail: 'You\'ll see a sidebar with different storage options.'
    },
    {
      title: '4. Find Cookies',
      description: 'Click on "Cookies" then "fantasy.espn.com"',
      detail: 'You\'ll see a list of all cookies for ESPN Fantasy.'
    },
    {
      title: '5. Copy Your Tokens',
      description: 'Find and copy these two values:',
      detail: (
        <div className="space-y-2 mt-2">
          <div className="p-2 bg-gray-100 rounded">
            <code className="text-sm font-mono">SWID</code> - Looks like: {'{'}abcd1234-5678-90ab-cdef-1234567890ab{'}'}
          </div>
          <div className="p-2 bg-gray-100 rounded">
            <code className="text-sm font-mono">espn_s2</code> - A very long string of random characters
          </div>
        </div>
      )
    },
    {
      title: '6. Get Your League ID',
      description: 'Look at your ESPN league URL',
      detail: (
        <div className="p-2 bg-gray-100 rounded mt-2">
          <code className="text-sm">fantasy.espn.com/football/league?leagueId=<span className="text-blue-600 font-bold">123456</span></code>
          <p className="text-sm mt-1">Copy the number after leagueId=</p>
        </div>
      )
    }
  ]

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Connect ESPN Fantasy League</CardTitle>
        <CardDescription>
          Import your ESPN Fantasy Football league by providing your authentication tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium mb-1">
                Need help finding your tokens?
              </p>
              <p className="text-sm text-blue-800 mb-2">
                We'll guide you through getting your ESPN authentication tokens. It's easier than it sounds!
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInstructions(true)}
              >
                Show Me How
              </Button>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* League ID */}
          <div>
            <label className="block text-sm font-medium mb-1">
              League ID
              <span className="text-gray-500 font-normal ml-2">
                (from your league URL)
              </span>
            </label>
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="e.g., 123456"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* SWID Token */}
          <div>
            <label className="block text-sm font-medium mb-1">
              SWID Token
              <span className="text-gray-500 font-normal ml-2">
                (your ESPN account ID)
              </span>
            </label>
            <div className="relative">
              <input
                type={showTokens ? 'text' : 'password'}
                value={swid}
                onChange={(e) => setSwid(e.target.value)}
                placeholder="{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}"
                className="w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowTokens(!showTokens)}
                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showTokens ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* ESPN_S2 Token */}
          <div>
            <label className="block text-sm font-medium mb-1">
              ESPN_S2 Token
              <span className="text-gray-500 font-normal ml-2">
                (session cookie)
              </span>
            </label>
            <textarea
              value={espnS2}
              onChange={(e) => setEspnS2(e.target.value)}
              placeholder="A very long string that starts with AEB..."
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              rows={3}
              required
            />
          </div>

          {/* Privacy Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-medium mb-1">Your data is secure</p>
                <p className="text-green-800">
                  Your tokens are encrypted and stored securely. They're only used to fetch your league data from ESPN.
                  We never store your ESPN password.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !leagueId || !swid || !espnS2}
          >
            {loading ? 'Connecting...' : 'Connect League'}
          </Button>
        </form>
      </CardContent>

      {/* Instructions Modal */}
      <AlertDialog open={showInstructions} onOpenChange={setShowInstructions}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>How to Get Your ESPN Tokens</AlertDialogTitle>
            <AlertDialogDescription>
              Follow these steps to find your authentication tokens. This is a one-time process.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 mt-4">
            {instructions.map((instruction, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 ${
                  step === index + 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <h3 className="font-semibold text-lg mb-1">{instruction.title}</h3>
                <p className="text-gray-700 mb-2">{instruction.description}</p>
                {typeof instruction.detail === 'string' ? (
                  <p className="text-sm text-gray-600">{instruction.detail}</p>
                ) : (
                  instruction.detail
                )}
              </div>
            ))}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                Previous
              </Button>
              {step < instructions.length ? (
                <Button
                  onClick={() => setStep(Math.min(instructions.length, step + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => setShowInstructions(false)}
                >
                  Got It!
                </Button>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900">
                <strong>Tip:</strong> Your tokens expire after about a year. You'll need to update them annually.
              </p>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
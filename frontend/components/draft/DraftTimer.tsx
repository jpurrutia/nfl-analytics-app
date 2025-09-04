'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, Play, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react'

interface DraftTimerProps {
  timeLimit?: number // in seconds
  currentTeam?: string
  onTimeExpired?: () => void
  onPause?: () => void
  onResume?: () => void
  onSkip?: () => void
}

export default function DraftTimer({
  timeLimit = 90,
  currentTeam = 'Team 1',
  onTimeExpired,
  onPause,
  onResume,
  onSkip,
}: DraftTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    setTimeRemaining(timeLimit)
    setIsPaused(false)
  }, [currentTeam, timeLimit])

  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!isMuted) {
            // Play sound notification
            const audio = new Audio('/notification.mp3')
            audio.play().catch(() => {})
          }
          onTimeExpired?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPaused, timeRemaining, onTimeExpired, isMuted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = ((timeLimit - timeRemaining) / timeLimit) * 100

  const getProgressColor = () => {
    if (timeRemaining <= 10) return 'bg-red-500'
    if (timeRemaining <= 30) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false)
      onResume?.()
    } else {
      setIsPaused(true)
      onPause?.()
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Draft Timer</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="text-center space-y-2">
            <div className="text-4xl font-bold tabular-nums">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-lg font-medium">{currentTeam}</div>
          </div>

          <div className="space-y-2">
            <Progress 
              value={progressPercentage} 
              className="h-3"
              indicatorClassName={getProgressColor()}
            />
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>On the clock</span>
              <span>{timeLimit}s limit</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePauseResume}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onSkip}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip
            </Button>
          </div>

          {timeRemaining <= 10 && timeRemaining > 0 && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center">
              <span className="text-sm font-medium text-red-800">
                Time is running out!
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
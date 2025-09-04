'use client';

import React from 'react';
import { cn, getPositionColor, getScoreColor, formatPercentage } from '@/lib/utils';

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    position: string;
    team: string;
    projection: number;
    floor: number;
    ceiling: number;
    consistency: number;
    boom_rate: number;
    bust_rate: number;
    adp: number;
    last_5_games?: number[];
  };
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const valueOverADP = player.projection - player.adp;
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
            <div className="flex items-center mt-1 space-x-3">
              <span className={cn('px-2 py-1 text-xs font-semibold rounded', getPositionColor(player.position))}>
                {player.position}
              </span>
              <span className="text-white/90 text-sm">{player.team}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {player.projection.toFixed(1)}
            </div>
            <div className="text-xs text-white/70">Projected Points</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">Floor / Ceiling</div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-lg font-semibold text-gray-900">
                {player.floor?.toFixed(1) || 'N/A'}
              </span>
              <span className="text-gray-500">/</span>
              <span className="text-lg font-semibold text-gray-900">
                {player.ceiling?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">ADP</div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-lg font-semibold text-gray-900">
                {player.adp.toFixed(1)}
              </span>
              <span className={cn('text-sm', valueOverADP > 0 ? 'text-green-600' : 'text-red-600')}>
                {valueOverADP > 0 ? '+' : ''}{valueOverADP.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Consistency</span>
              <span className="font-medium">{player.consistency.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${player.consistency}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Boom Rate</span>
              <span className={cn('font-medium', player.boom_rate > 30 ? 'text-green-600' : '')}>
                {formatPercentage(player.boom_rate / 100, 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${player.boom_rate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Bust Rate</span>
              <span className={cn('font-medium', player.bust_rate > 30 ? 'text-red-600' : '')}>
                {formatPercentage(player.bust_rate / 100, 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${player.bust_rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Last 5 Games Trend */}
        {player.last_5_games && (
          <div className="mt-6">
            <div className="text-sm text-gray-600 mb-2">Last 5 Games</div>
            <div className="flex space-x-1">
              {player.last_5_games.map((score, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gray-100 rounded-md p-2 text-center"
                >
                  <div className={cn('text-sm font-semibold', getScoreColor(score))}>
                    {score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
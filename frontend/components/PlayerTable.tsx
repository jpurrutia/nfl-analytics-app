'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn, getPositionColor, getScoreColor, formatPercentage } from '@/lib/utils';

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  projection: number;
  adp: number;
  consistency: number;
  boom_rate: number;
  bust_rate: number;
  target_share?: number;
  red_zone_touches?: number;
}

interface PlayerTableProps {
  players: Player[];
  onPlayerClick?: (player: Player) => void;
  loading?: boolean;
}

export default function PlayerTable({ players, onPlayerClick, loading }: PlayerTableProps) {
  const [sortField, setSortField] = useState<keyof Player>('projection');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');

  // Sort players
  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });

  // Filter by position
  const filteredPlayers = positionFilter === 'ALL'
    ? sortedPlayers
    : sortedPlayers.filter(p => p.position === positionFilter);

  const handleSort = (field: keyof Player) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DST', 'K'];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Position Filter */}
      <div className="mb-4 flex space-x-2">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => setPositionFilter(pos)}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              positionFilter === pos
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Player
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('position')}
              >
                Pos {sortField === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Team
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('projection')}
              >
                Proj {sortField === 'projection' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('adp')}
              >
                ADP {sortField === 'adp' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('consistency')}
              >
                Cons {sortField === 'consistency' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('boom_rate')}
              >
                Boom {sortField === 'boom_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('bust_rate')}
              >
                Bust {sortField === 'bust_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPlayers.map((player) => (
              <tr
                key={player.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onPlayerClick?.(player)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    <Link
                      href={`/players/${player.id}`}
                      className="hover:text-indigo-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {player.name}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn('px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getPositionColor(player.position))}>
                    {player.position}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {player.team}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn('text-sm', getScoreColor(player.projection))}>
                    {player.projection.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {player.adp.toFixed(1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900">{player.consistency.toFixed(1)}</div>
                    <div className="ml-2 flex-shrink-0">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${player.consistency}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn('text-sm', player.boom_rate > 30 ? 'text-green-600 font-medium' : 'text-gray-500')}>
                    {formatPercentage(player.boom_rate / 100, 0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn('text-sm', player.bust_rate > 30 ? 'text-red-600 font-medium' : 'text-gray-500')}>
                    {formatPercentage(player.bust_rate / 100, 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
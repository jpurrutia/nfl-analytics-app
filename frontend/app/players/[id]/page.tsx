'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import PlayerCard from '@/components/PlayerCard';
import MetricsChart from '@/components/MetricsChart';
import { players as playersApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;

  // Fetch player details
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const response = await playersApi.get(playerId);
      return response.data;
    },
  });

  // Fetch player stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: async () => {
      const response = await playersApi.getStats(playerId, { season: 2024 });
      return response.data;
    },
  });

  // Fetch player metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['player-metrics', playerId],
    queryFn: async () => {
      const response = await playersApi.getMetrics(playerId, { season: 2024 });
      return response.data;
    },
  });

  const isLoading = playerLoading || statsLoading || metricsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-48 bg-gray-100 rounded"></div>
              <div className="h-48 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!player) {
    toast.error('Player not found');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to players
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Card */}
          <div className="lg:col-span-1">
            <PlayerCard player={player} />
          </div>

          {/* Charts and Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            {stats?.weekly_stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Weekly Performance</h3>
                <MetricsChart
                  data={stats.weekly_stats}
                  dataKey="points"
                  xKey="week"
                  color="#6366f1"
                  height={300}
                />
              </div>
            )}

            {/* Advanced Metrics */}
            {metrics && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Advanced Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  {metrics.target_share && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Target Share</div>
                      <div className="mt-1 text-2xl font-semibold">
                        {(metrics.target_share * 100).toFixed(1)}%
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Rank: #{metrics.target_share_rank || 'N/A'}
                      </div>
                    </div>
                  )}
                  
                  {metrics.red_zone_touches && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Red Zone Touches</div>
                      <div className="mt-1 text-2xl font-semibold">
                        {metrics.red_zone_touches}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Per game: {(metrics.red_zone_touches / 17).toFixed(1)}
                      </div>
                    </div>
                  )}
                  
                  {metrics.snap_share && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Snap Share</div>
                      <div className="mt-1 text-2xl font-semibold">
                        {(metrics.snap_share * 100).toFixed(1)}%
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {metrics.snap_count} total snaps
                      </div>
                    </div>
                  )}
                  
                  {metrics.yards_after_catch && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">YAC Average</div>
                      <div className="mt-1 text-2xl font-semibold">
                        {metrics.yards_after_catch.toFixed(1)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Yards after catch
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Season Stats */}
            {stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Season Statistics</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stat</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Per Game</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.passing_yards && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-600">Passing Yards</td>
                          <td className="px-4 py-2 text-sm font-medium">{stats.passing_yards}</td>
                          <td className="px-4 py-2 text-sm">{(stats.passing_yards / stats.games_played).toFixed(1)}</td>
                        </tr>
                      )}
                      {stats.rushing_yards && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-600">Rushing Yards</td>
                          <td className="px-4 py-2 text-sm font-medium">{stats.rushing_yards}</td>
                          <td className="px-4 py-2 text-sm">{(stats.rushing_yards / stats.games_played).toFixed(1)}</td>
                        </tr>
                      )}
                      {stats.receiving_yards && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-600">Receiving Yards</td>
                          <td className="px-4 py-2 text-sm font-medium">{stats.receiving_yards}</td>
                          <td className="px-4 py-2 text-sm">{(stats.receiving_yards / stats.games_played).toFixed(1)}</td>
                        </tr>
                      )}
                      {stats.touchdowns && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-600">Touchdowns</td>
                          <td className="px-4 py-2 text-sm font-medium">{stats.touchdowns}</td>
                          <td className="px-4 py-2 text-sm">{(stats.touchdowns / stats.games_played).toFixed(2)}</td>
                        </tr>
                      )}
                      {stats.receptions && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-600">Receptions</td>
                          <td className="px-4 py-2 text-sm font-medium">{stats.receptions}</td>
                          <td className="px-4 py-2 text-sm">{(stats.receptions / stats.games_played).toFixed(1)}</td>
                        </tr>
                      )}
                      {stats.targets && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-600">Targets</td>
                          <td className="px-4 py-2 text-sm font-medium">{stats.targets}</td>
                          <td className="px-4 py-2 text-sm">{(stats.targets / stats.games_played).toFixed(1)}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">Fantasy Points</td>
                        <td className="px-4 py-2 text-sm font-bold text-indigo-600">{stats.total_points?.toFixed(1)}</td>
                        <td className="px-4 py-2 text-sm font-bold text-indigo-600">
                          {(stats.total_points / stats.games_played).toFixed(1)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
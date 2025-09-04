'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { 
  Shield, 
  Plus, 
  Users, 
  Trophy,
  TrendingUp,
  Calendar,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

interface League {
  id: string;
  name: string;
  platform: 'ESPN' | 'Yahoo' | 'Sleeper';
  teams: number;
  scoring: string;
  status: 'active' | 'draft' | 'complete';
  currentRank: number;
  weeklyScore: number;
  totalScore: number;
  syncStatus: 'synced' | 'syncing' | 'error';
  lastSync: string;
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([
    {
      id: '1',
      name: 'Championship League',
      platform: 'ESPN',
      teams: 12,
      scoring: 'PPR',
      status: 'active',
      currentRank: 3,
      weeklyScore: 142.5,
      totalScore: 1247.8,
      syncStatus: 'synced',
      lastSync: '2 hours ago'
    },
    {
      id: '2',
      name: 'Dynasty Warriors',
      platform: 'ESPN',
      teams: 10,
      scoring: 'Half-PPR',
      status: 'active',
      currentRank: 5,
      weeklyScore: 128.3,
      totalScore: 1102.4,
      syncStatus: 'synced',
      lastSync: '3 hours ago'
    },
    {
      id: '3',
      name: 'Keeper League 2025',
      platform: 'ESPN',
      teams: 14,
      scoring: 'Standard',
      status: 'draft',
      currentRank: 0,
      weeklyScore: 0,
      totalScore: 0,
      syncStatus: 'syncing',
      lastSync: 'In progress...'
    }
  ]);

  const getPlatformColor = (platform: string) => {
    switch(platform) {
      case 'ESPN': return 'from-red-500 to-red-600';
      case 'Yahoo': return 'from-purple-500 to-purple-600';
      case 'Sleeper': return 'from-blue-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>;
      case 'draft':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Drafting</span>;
      case 'complete':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Complete</span>;
      default:
        return null;
    }
  };

  const getSyncIcon = (status: string) => {
    switch(status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Leagues</h1>
              <p className="text-gray-600 mt-1">Manage and track your fantasy leagues</p>
            </div>
            <Link
              href="/leagues/connect"
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Connect League</span>
            </Link>
          </div>
        </div>

        {/* League Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Leagues</span>
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{leagues.length}</p>
            <p className="text-xs text-gray-500 mt-1">Connected</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Leagues</span>
              <Zap className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {leagues.filter(l => l.status === 'active').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">In season</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Rank</span>
              <Trophy className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {leagues.filter(l => l.status === 'active').reduce((acc, l) => acc + l.currentRank, 0) / leagues.filter(l => l.status === 'active').length || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Across all leagues</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Weekly Points</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {leagues.reduce((acc, l) => acc + l.weeklyScore, 0).toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Combined total</p>
          </div>
        </div>

        {/* Leagues List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {leagues.map((league) => (
            <div key={league.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* League Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-gradient-to-r ${getPlatformColor(league.platform)} rounded-lg text-white`}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{league.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">{league.platform}</span>
                        {getStatusBadge(league.status)}
                      </div>
                    </div>
                  </div>
                  <Link href={`/leagues/${league.id}`} className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>

                {/* League Info */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Teams</p>
                    <p className="font-semibold text-gray-900">{league.teams}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Scoring</p>
                    <p className="font-semibold text-gray-900">{league.scoring}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Rank</p>
                    <p className="font-semibold text-gray-900">
                      {league.currentRank > 0 ? `#${league.currentRank}` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* League Stats */}
              {league.status === 'active' && (
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">This Week</p>
                      <p className="text-2xl font-bold text-gray-900">{league.weeklyScore}</p>
                      <p className="text-xs text-green-600 mt-1">+12.5 vs projection</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Points</p>
                      <p className="text-2xl font-bold text-gray-900">{league.totalScore}</p>
                      <p className="text-xs text-gray-600 mt-1">Season total</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              <div className="px-6 py-3 bg-white border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSyncIcon(league.syncStatus)}
                    <span className="text-sm text-gray-600">
                      {league.syncStatus === 'syncing' ? 'Syncing...' : `Last sync: ${league.lastSync}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add League Card */}
          <Link
            href="/leagues/connect"
            className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[300px] group"
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect New League</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Import your ESPN, Yahoo, or Sleeper league to get personalized insights
              </p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
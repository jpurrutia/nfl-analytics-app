'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  Shield,
  Activity,
  ChevronUp,
  ChevronDown,
  Star,
  AlertCircle
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  bye_week: number;
  adp: number;
  projected_points: number;
  consistency_score: number;
  boom_rate: number;
  bust_rate: number;
  target_share?: number;
  red_zone_touches?: number;
  trend: 'up' | 'down' | 'stable';
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'adp' | 'projected' | 'consistency'>('adp');

  // Mock data - replace with API call
  useEffect(() => {
    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        bye_week: 9,
        adp: 1.2,
        projected_points: 385.5,
        consistency_score: 92,
        boom_rate: 68,
        bust_rate: 8,
        red_zone_touches: 145,
        trend: 'stable'
      },
      {
        id: '2',
        name: 'CeeDee Lamb',
        position: 'WR',
        team: 'DAL',
        bye_week: 7,
        adp: 2.8,
        projected_points: 342.3,
        consistency_score: 88,
        boom_rate: 62,
        bust_rate: 12,
        target_share: 28.5,
        trend: 'up'
      },
      {
        id: '3',
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        bye_week: 6,
        adp: 3.1,
        projected_points: 338.7,
        consistency_score: 85,
        boom_rate: 72,
        bust_rate: 15,
        target_share: 27.8,
        trend: 'stable'
      },
      {
        id: '4',
        name: 'Breece Hall',
        position: 'RB',
        team: 'NYJ',
        bye_week: 12,
        adp: 5.2,
        projected_points: 298.4,
        consistency_score: 82,
        boom_rate: 58,
        bust_rate: 18,
        red_zone_touches: 98,
        trend: 'up'
      },
      {
        id: '5',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        bye_week: 12,
        adp: 18.5,
        projected_points: 412.8,
        consistency_score: 94,
        boom_rate: 75,
        bust_rate: 5,
        red_zone_touches: 42,
        trend: 'stable'
      },
      {
        id: '6',
        name: 'Travis Kelce',
        position: 'TE',
        team: 'KC',
        bye_week: 6,
        adp: 12.3,
        projected_points: 245.6,
        consistency_score: 90,
        boom_rate: 55,
        bust_rate: 10,
        target_share: 24.2,
        trend: 'down'
      }
    ];

    setTimeout(() => {
      setPlayers(mockPlayers);
      setLoading(false);
    }, 500);
  }, []);

  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'adp':
          return a.adp - b.adp;
        case 'projected':
          return b.projected_points - a.projected_points;
        case 'consistency':
          return b.consistency_score - a.consistency_score;
        default:
          return 0;
      }
    });

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE'];

  const getPositionColor = (position: string) => {
    switch(position) {
      case 'QB': return 'from-red-500 to-red-600';
      case 'RB': return 'from-blue-500 to-blue-600';
      case 'WR': return 'from-green-500 to-green-600';
      case 'TE': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Player Analytics</h1>
              <p className="text-gray-600 mt-1">Advanced metrics and projections for all players</p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search players or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
              
              {/* Position Filter */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {positions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      positionFilter === pos 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="adp">Sort by ADP</option>
                <option value="projected">Sort by Projected Points</option>
                <option value="consistency">Sort by Consistency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Players</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{players.length}</p>
            <p className="text-xs text-gray-500 mt-1">Available for analysis</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Consistency</span>
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(players.reduce((acc, p) => acc + p.consistency_score, 0) / players.length || 0)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">League average</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Top Boom Rate</span>
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.max(...players.map(p => p.boom_rate))}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Highest ceiling player</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Data Updated</span>
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">Live</p>
            <p className="text-xs text-gray-500 mt-1">Real-time sync</p>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team / Bye
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ADP
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projected
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consistency
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boom/Bust
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metrics
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                        Loading player data...
                      </div>
                    </td>
                  </tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No players found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`px-2.5 py-1 bg-gradient-to-r ${getPositionColor(player.position)} text-white text-xs font-bold rounded-md`}>
                            {player.position}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{player.name}</p>
                            <div className="flex items-center mt-1">
                              {player.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500 mr-1" />}
                              {player.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500 mr-1" />}
                              {player.trend === 'stable' && <span className="w-3 h-3 bg-gray-400 rounded-full inline-block mr-1" />}
                              <span className="text-xs text-gray-500">
                                {player.trend === 'up' ? 'Rising' : player.trend === 'down' ? 'Falling' : 'Stable'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{player.team}</p>
                          <p className="text-xs text-gray-500">Bye: Week {player.bye_week}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-900">{player.adp.toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-semibold text-gray-900">{player.projected_points.toFixed(1)}</span>
                        <p className="text-xs text-gray-500">pts</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${getScoreColor(player.consistency_score)}`}>
                            {player.consistency_score}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full"
                              style={{width: `${player.consistency_score}%`}}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs">
                            <span className="text-green-600 font-semibold">{player.boom_rate}%</span> boom
                          </span>
                          <span className="text-xs">
                            <span className="text-red-600 font-semibold">{player.bust_rate}%</span> bust
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1 text-xs">
                          {player.target_share && (
                            <span className="text-gray-600">
                              Target: {player.target_share}%
                            </span>
                          )}
                          {player.red_zone_touches && (
                            <span className="text-gray-600">
                              RZ: {player.red_zone_touches}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Star className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
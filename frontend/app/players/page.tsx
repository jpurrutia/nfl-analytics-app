'use client';

import React, { useState, useEffect } from 'react';
import ModernLayout from '@/components/ModernLayout';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Star,
  Trophy,
  Target,
  Zap,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  Activity
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
  trend: 'up' | 'down' | 'stable';
  image?: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'adp' | 'projected' | 'consistency'>('adp');

  // Mock data
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
        boom_rate: 0.65,
        bust_rate: 0.08,
        trend: 'up'
      },
      {
        id: '2',
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        bye_week: 10,
        adp: 3.5,
        projected_points: 345.2,
        consistency_score: 88,
        boom_rate: 0.72,
        bust_rate: 0.12,
        trend: 'stable'
      },
      {
        id: '3',
        name: 'Justin Jefferson',
        position: 'WR',
        team: 'MIN',
        bye_week: 13,
        adp: 2.8,
        projected_points: 358.9,
        consistency_score: 90,
        boom_rate: 0.68,
        bust_rate: 0.09,
        trend: 'up'
      },
      {
        id: '4',
        name: 'Austin Ekeler',
        position: 'RB',
        team: 'LAC',
        bye_week: 5,
        adp: 5.2,
        projected_points: 315.4,
        consistency_score: 85,
        boom_rate: 0.58,
        bust_rate: 0.15,
        trend: 'down'
      },
      {
        id: '5',
        name: 'Travis Kelce',
        position: 'TE',
        team: 'KC',
        bye_week: 10,
        adp: 12.5,
        projected_points: 245.6,
        consistency_score: 94,
        boom_rate: 0.45,
        bust_rate: 0.05,
        trend: 'stable'
      },
      {
        id: '6',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        bye_week: 13,
        adp: 24.3,
        projected_points: 412.8,
        consistency_score: 89,
        boom_rate: 0.62,
        bust_rate: 0.10,
        trend: 'up'
      }
    ];
    
    setPlayers(mockPlayers);
    setLoading(false);
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
        case 'projected':
          return b.projected_points - a.projected_points;
        case 'consistency':
          return b.consistency_score - a.consistency_score;
        default:
          return a.adp - b.adp;
      }
    });

  const getPositionColor = (position: string) => {
    switch(position) {
      case 'QB': return '#ef4444';
      case 'RB': return '#10b981';
      case 'WR': return '#3b82f6';
      case 'TE': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <ModernLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            Player Rankings
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Advanced analytics and projections for all NFL players
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            flex: '1',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Players</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{players.length}</p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trophy style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              </div>
            </div>
          </div>

          <div style={{
            flex: '1',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Avg Consistency</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>88.5%</p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity style={{ width: '24px', height: '24px', color: '#10b981' }} />
              </div>
            </div>
          </div>

          <div style={{
            flex: '1',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Trending Up</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>24</p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          border: '1px solid #f3f4f6',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: '1', position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                placeholder="Search players or teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '44px',
                  paddingRight: '16px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Position Filter */}
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">All Positions</option>
              <option value="QB">Quarterback</option>
              <option value="RB">Running Back</option>
              <option value="WR">Wide Receiver</option>
              <option value="TE">Tight End</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '10px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="adp">Sort by ADP</option>
              <option value="projected">Sort by Projected Points</option>
              <option value="consistency">Sort by Consistency</option>
            </select>
          </div>
        </div>

        {/* Players Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          border: '1px solid #f3f4f6',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
              Player Rankings
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280' }}>Loading players...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Rank</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Player</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Position</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Team</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Bye</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ADP</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Projected</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Consistency</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Boom %</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, index) => (
                    <tr 
                      key={player.id}
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: '#111827' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600'
                          }}>
                            {player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{player.name}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: `${getPositionColor(player.position)}15`,
                          color: getPositionColor(player.position)
                        }}>
                          {player.position}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#374151' }}>
                        {player.team}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#374151' }}>
                        {player.bye_week}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {player.adp}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {player.projected_points}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '60px',
                            height: '8px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${player.consistency_score}%`,
                              height: '100%',
                              backgroundColor: player.consistency_score > 85 ? '#10b981' : '#f59e0b',
                              borderRadius: '4px'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{player.consistency_score}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: player.boom_rate > 0.6 ? '#10b981' : '#6b7280'
                        }}>
                          {(player.boom_rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {player.trend === 'up' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                            <TrendingUp style={{ width: '16px', height: '16px' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>Rising</span>
                          </div>
                        )}
                        {player.trend === 'down' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                            <TrendingDown style={{ width: '16px', height: '16px' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>Falling</span>
                          </div>
                        )}
                        {player.trend === 'stable' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                            <ArrowUpRight style={{ width: '16px', height: '16px' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>Stable</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  );
}
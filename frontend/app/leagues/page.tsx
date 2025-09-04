'use client';

import React, { useState } from 'react';
import ModernLayout from '@/components/ModernLayout';
import { 
  Trophy, 
  Users, 
  TrendingUp,
  Medal,
  Calendar,
  DollarSign,
  Activity,
  Star,
  ChevronUp,
  ChevronDown,
  Plus,
  Settings,
  ArrowRight
} from 'lucide-react';

interface League {
  id: string;
  name: string;
  type: string;
  teams: number;
  buyIn: number;
  prize: number;
  draftDate: string;
  status: 'active' | 'drafting' | 'upcoming';
  myRank: number;
  myRecord: string;
  topPlayer: string;
}

interface Standing {
  rank: number;
  team: string;
  owner: string;
  record: string;
  points: number;
  pointsAgainst: number;
  streak: string;
  trend: 'up' | 'down' | 'same';
}

export default function LeaguesPage() {
  const [selectedLeague, setSelectedLeague] = useState<string>('1');

  // Mock data
  const leagues: League[] = [
    {
      id: '1',
      name: 'Championship League',
      type: '12-Team PPR',
      teams: 12,
      buyIn: 100,
      prize: 1000,
      draftDate: '2024-08-28',
      status: 'active',
      myRank: 3,
      myRecord: '8-2',
      topPlayer: 'Christian McCaffrey'
    },
    {
      id: '2',
      name: 'Dynasty Warriors',
      type: '10-Team Dynasty',
      teams: 10,
      buyIn: 250,
      prize: 2000,
      draftDate: '2024-08-15',
      status: 'active',
      myRank: 1,
      myRecord: '9-1',
      topPlayer: 'Justin Jefferson'
    },
    {
      id: '3',
      name: 'Rookie League',
      type: '8-Team Standard',
      teams: 8,
      buyIn: 50,
      prize: 350,
      draftDate: '2024-09-01',
      status: 'upcoming',
      myRank: 0,
      myRecord: '0-0',
      topPlayer: 'Not Drafted'
    }
  ];

  const standings: Standing[] = [
    { rank: 1, team: 'Dynasty Destroyers', owner: 'Alex Chen', record: '9-1', points: 1542.8, pointsAgainst: 1325.4, streak: 'W5', trend: 'up' },
    { rank: 2, team: 'Touchdown Titans', owner: 'Sarah Johnson', record: '8-2', points: 1498.6, pointsAgainst: 1342.2, streak: 'W2', trend: 'up' },
    { rank: 3, team: 'Your Team', owner: 'You', record: '8-2', points: 1485.2, pointsAgainst: 1358.9, streak: 'W3', trend: 'up' },
    { rank: 4, team: 'Gridiron Gladiators', owner: 'Mike Wilson', record: '6-4', points: 1412.3, pointsAgainst: 1398.7, streak: 'L1', trend: 'down' },
    { rank: 5, team: 'Field Goal Fanatics', owner: 'Emma Davis', record: '5-5', points: 1389.1, pointsAgainst: 1402.5, streak: 'W1', trend: 'up' },
    { rank: 6, team: 'Blitz Brigade', owner: 'James Lee', record: '5-5', points: 1376.9, pointsAgainst: 1415.3, streak: 'L2', trend: 'down' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'drafting': return '#f59e0b';
      case 'upcoming': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStreakColor = (streak: string) => {
    if (streak.startsWith('W')) return '#10b981';
    if (streak.startsWith('L')) return '#ef4444';
    return '#6b7280';
  };

  const currentLeague = leagues.find(l => l.id === selectedLeague);

  return (
    <ModernLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            My Leagues
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Manage your fantasy football leagues and track standings
          </p>
        </div>

        {/* League Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {leagues.map(league => (
            <div
              key={league.id}
              onClick={() => setSelectedLeague(league.id)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                border: selectedLeague === league.id ? '2px solid #3b82f6' : '1px solid #f3f4f6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (selectedLeague !== league.id) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: `${getStatusColor(league.status)}15`,
                color: getStatusColor(league.status),
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {league.status}
              </div>

              <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trophy style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                    {league.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    {league.type} • {league.teams} Teams
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>My Rank</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Medal style={{ width: '16px', height: '16px', color: league.myRank <= 3 ? '#f59e0b' : '#6b7280' }} />
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {league.myRank > 0 ? `#${league.myRank}` : 'TBD'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Record</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {league.myRecord}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Buy-In</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        ${league.buyIn}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Prize Pool</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                        ${league.prize}
                      </p>
                    </div>
                  </div>

                  {league.status === 'upcoming' && (
                    <div style={{
                      marginTop: '16px',
                      padding: '8px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Calendar style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                      <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>
                        Draft: {new Date(league.draftDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Create New League Card */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '2px dashed #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <Plus style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
              Create New League
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Start your own league
            </p>
          </div>
        </div>

        {/* League Details */}
        {currentLeague && (
          <div>
            {/* League Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>League Rank</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                      #{currentLeague.myRank || 'TBD'}
                    </p>
                  </div>
                  <Trophy style={{ width: '32px', height: '32px', color: '#f59e0b' }} />
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Points For</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>1485.2</p>
                  </div>
                  <TrendingUp style={{ width: '32px', height: '32px', color: '#10b981' }} />
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Win Streak</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>W3</p>
                  </div>
                  <Activity style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Prize Pool</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                      ${currentLeague.prize}
                    </p>
                  </div>
                  <DollarSign style={{ width: '32px', height: '32px', color: '#10b981' }} />
                </div>
              </div>
            </div>

            {/* Standings Table */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '1px solid #f3f4f6',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                  League Standings
                </h2>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Settings style={{ width: '16px', height: '16px' }} />
                  League Settings
                </button>
              </div>

              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Rank</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Team</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Record</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>PF</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>PA</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Streak</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(standing => (
                    <tr 
                      key={standing.rank}
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: standing.owner === 'You' ? '#f0f9ff' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {standing.rank <= 3 && (
                            <Medal style={{ 
                              width: '20px', 
                              height: '20px', 
                              color: standing.rank === 1 ? '#fbbf24' : standing.rank === 2 ? '#cbd5e1' : '#f97316'
                            }} />
                          )}
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            {standing.rank}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {standing.team}
                        {standing.owner === 'You' && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            YOUR TEAM
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#6b7280' }}>
                        {standing.owner}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {standing.record}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#111827' }}>
                        {standing.points}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#6b7280' }}>
                        {standing.pointsAgainst}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: `${getStreakColor(standing.streak)}15`,
                          color: getStreakColor(standing.streak)
                        }}>
                          {standing.streak}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {standing.trend === 'up' && <ChevronUp style={{ width: '16px', height: '16px', color: '#10b981' }} />}
                        {standing.trend === 'down' && <ChevronDown style={{ width: '16px', height: '16px', color: '#ef4444' }} />}
                        {standing.trend === 'same' && <ArrowRight style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
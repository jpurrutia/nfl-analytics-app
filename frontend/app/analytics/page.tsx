'use client'

import { useEffect, useState } from 'react'
import ModernLayout from '@/components/ModernLayout'
import axios from 'axios'

interface PlayerMetrics {
  player_name: string
  position: string
  team: string
  consensus_points_ppr: number
  floor_points_ppr: number
  ceiling_points_ppr: number
  projection_std_dev: number
  num_sources: number
  confidence_rating: string
  boom_percentage?: number
  bust_percentage?: number
  consistency_score?: number
}

interface TeamMetrics {
  team: string
  total_projected_points: number
  player_count: number
  avg_confidence: number
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<PlayerMetrics[]>([])
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [selectedPosition, setSelectedPosition] = useState('ALL')
  const [sortBy, setSortBy] = useState<'ceiling' | 'floor' | 'variance'>('ceiling')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [selectedWeek, selectedPosition])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params: any = { week: selectedWeek }
      if (selectedPosition !== 'ALL') {
        params.position = selectedPosition
      }
      
      const response = await axios.get('http://localhost:8080/api/projections', { params })
      const data = response.data.projections || []
      
      // Calculate additional metrics
      const enrichedData = data.map((player: any) => ({
        ...player,
        boom_percentage: player.ceiling_points_ppr > player.consensus_points_ppr * 1.2 ? 
          ((player.ceiling_points_ppr - player.consensus_points_ppr) / player.consensus_points_ppr * 100) : 0,
        bust_percentage: player.floor_points_ppr < player.consensus_points_ppr * 0.8 ? 
          ((player.consensus_points_ppr - player.floor_points_ppr) / player.consensus_points_ppr * 100) : 0,
        consistency_score: player.projection_std_dev ? (100 - Math.min(player.projection_std_dev * 10, 100)) : 50
      }))
      
      setMetrics(enrichedData)
      
      // Calculate team metrics
      const teams = enrichedData.reduce((acc: any, player: PlayerMetrics) => {
        if (!player.team) return acc
        
        if (!acc[player.team]) {
          acc[player.team] = {
            team: player.team,
            total_projected_points: 0,
            player_count: 0,
            confidence_sum: 0
          }
        }
        
        acc[player.team].total_projected_points += player.consensus_points_ppr
        acc[player.team].player_count += 1
        acc[player.team].confidence_sum += player.confidence_rating === 'HIGH' ? 3 : 
                                           player.confidence_rating === 'MEDIUM' ? 2 : 1
        
        return acc
      }, {})
      
      const teamArray = Object.values(teams).map((team: any) => ({
        team: team.team,
        total_projected_points: team.total_projected_points,
        player_count: team.player_count,
        avg_confidence: team.confidence_sum / team.player_count
      })).sort((a, b) => b.total_projected_points - a.total_projected_points)
      
      setTeamMetrics(teamArray)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSortedMetrics = () => {
    return [...metrics].sort((a, b) => {
      switch (sortBy) {
        case 'ceiling':
          return (b.ceiling_points_ppr - b.consensus_points_ppr) - (a.ceiling_points_ppr - a.consensus_points_ppr)
        case 'floor':
          return (a.consensus_points_ppr - a.floor_points_ppr) - (b.consensus_points_ppr - b.floor_points_ppr)
        case 'variance':
          return (b.projection_std_dev || 0) - (a.projection_std_dev || 0)
        default:
          return 0
      }
    })
  }

  const getVarianceColor = (stdDev: number) => {
    if (!stdDev) return '#6b7280'
    if (stdDev < 2) return '#10b981'
    if (stdDev < 4) return '#f59e0b'
    return '#ef4444'
  }

  const getConfidenceColor = (rating: string) => {
    switch (rating) {
      case 'HIGH': return '#10b981'
      case 'MEDIUM': return '#f59e0b'
      case 'LOW': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <ModernLayout>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '8px' 
          }}>
            Analytics Dashboard
          </h1>
          <p style={{ color: '#9ca3af' }}>
            Advanced metrics and variance analysis for Week {selectedWeek} projections
          </p>
        </div>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            style={{
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #374151',
              fontSize: '14px'
            }}
          >
            {[...Array(18)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>

          <select 
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            style={{
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #374151',
              fontSize: '14px'
            }}
          >
            <option value="ALL">All Positions</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
          </select>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button
              onClick={() => setSortBy('ceiling')}
              style={{
                padding: '10px 20px',
                backgroundColor: sortBy === 'ceiling' ? '#3b82f6' : '#1f2937',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Ceiling Upside
            </button>
            <button
              onClick={() => setSortBy('floor')}
              style={{
                padding: '10px 20px',
                backgroundColor: sortBy === 'floor' ? '#3b82f6' : '#1f2937',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Floor Risk
            </button>
            <button
              onClick={() => setSortBy('variance')}
              style={{
                padding: '10px 20px',
                backgroundColor: sortBy === 'variance' ? '#3b82f6' : '#1f2937',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              High Variance
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '2fr 1fr' }}>
          {/* Player Variance Analysis */}
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'white',
              marginBottom: '20px'
            }}>
              Player Variance Analysis
            </h2>

            {loading ? (
              <p style={{ color: '#9ca3af' }}>Loading analytics...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af' }}>Player</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Pos</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Floor</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Proj</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Ceiling</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Variance</th>
                      <th style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedMetrics().slice(0, 15).map((player, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #374151' }}>
                        <td style={{ padding: '12px', color: 'white' }}>
                          {player.player_name}
                          {player.team && (
                            <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '8px' }}>
                              {player.team}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>
                          {player.position}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#ef4444' }}>
                          {player.floor_points_ppr?.toFixed(1)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px', color: 'white', fontWeight: '600' }}>
                          {player.consensus_points_ppr?.toFixed(1)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#10b981' }}>
                          {player.ceiling_points_ppr?.toFixed(1)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <span style={{ 
                            color: getVarianceColor(player.projection_std_dev),
                            fontWeight: '600'
                          }}>
                            {player.projection_std_dev?.toFixed(1) || '-'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: getConfidenceColor(player.confidence_rating) + '20',
                            color: getConfidenceColor(player.confidence_rating)
                          }}>
                            {player.confidence_rating}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Team Projections */}
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'white',
              marginBottom: '20px'
            }}>
              Team Projections
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {teamMetrics.slice(0, 10).map((team, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#111827',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: '600' }}>{team.team}</div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>
                      {team.player_count} players
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#3b82f6', fontWeight: '600' }}>
                      {team.total_projected_points.toFixed(1)}
                    </div>
                    <div style={{ 
                      color: team.avg_confidence > 2.5 ? '#10b981' : 
                             team.avg_confidence > 1.5 ? '#f59e0b' : '#ef4444',
                      fontSize: '12px'
                    }}>
                      {team.avg_confidence > 2.5 ? 'High' : 
                       team.avg_confidence > 1.5 ? 'Med' : 'Low'} Conf
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Boom/Bust Analysis */}
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: 'white',
            marginBottom: '20px'
          }}>
            Boom/Bust Candidates
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Boom Candidates */}
            <div>
              <h3 style={{ color: '#10b981', marginBottom: '16px' }}>
                High Ceiling Players
              </h3>
              {metrics
                .sort((a, b) => (b.ceiling_points_ppr - b.consensus_points_ppr) - (a.ceiling_points_ppr - a.consensus_points_ppr))
                .slice(0, 5)
                .map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #374151'
                  }}>
                    <span style={{ color: 'white' }}>{player.player_name}</span>
                    <span style={{ color: '#10b981' }}>
                      +{(player.ceiling_points_ppr - player.consensus_points_ppr).toFixed(1)} pts
                    </span>
                  </div>
                ))}
            </div>

            {/* Bust Candidates */}
            <div>
              <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>
                High Risk Players
              </h3>
              {metrics
                .sort((a, b) => (b.consensus_points_ppr - b.floor_points_ppr) - (a.consensus_points_ppr - a.floor_points_ppr))
                .slice(0, 5)
                .map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #374151'
                  }}>
                    <span style={{ color: 'white' }}>{player.player_name}</span>
                    <span style={{ color: '#ef4444' }}>
                      -{(player.consensus_points_ppr - player.floor_points_ppr).toFixed(1)} pts
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}
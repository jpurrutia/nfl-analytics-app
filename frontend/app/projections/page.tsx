'use client';

import React, { useState, useEffect } from 'react';
import ModernLayout from '@/components/ModernLayout';
import { projections, PlayerProjection } from '@/lib/backend-api';
import { 
  TrendingUp, 
  Filter,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Trophy,
  Target,
  Shield
} from 'lucide-react';

export default function ProjectionsPage() {
  const [projectionsData, setProjectionsData] = useState<PlayerProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'consensus' | 'ceiling' | 'floor'>('consensus');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProjections();
  }, [selectedWeek]);

  const loadProjections = async () => {
    setLoading(true);
    try {
      console.log('Loading projections for week:', selectedWeek);
      const data = await projections.getWeekly(selectedWeek, 2025, 500);
      console.log('Received projections data:', data);
      setProjectionsData(data.projections);
    } catch (error) {
      console.error('Failed to load projections:', error);
      // Show error to user
      setProjectionsData([]);
    } finally {
      setLoading(false);
    }
  };

  const getPositionFromName = (name: string, position?: string): string => {
    // If position is provided and not N/A, use it
    if (position && position !== 'N/A') return position;
    
    // Try to infer from player stats (this is a simple heuristic)
    // In a real app, you'd have proper position data
    return 'N/A';
  };

  const getPositionColor = (position?: string) => {
    switch(position) {
      case 'QB': return '#ef4444';
      case 'RB': return '#10b981';
      case 'WR': return '#3b82f6';
      case 'TE': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch(confidence) {
      case 'HIGH': return { bg: '#10b98115', text: '#059669' };
      case 'MEDIUM': return { bg: '#f5970b15', text: '#d97706' };
      case 'LOW': return { bg: '#ef444415', text: '#dc2626' };
      default: return { bg: '#6b728015', text: '#4b5563' };
    }
  };

  console.log('Current projectionsData:', projectionsData);
  console.log('Current filters:', { selectedPosition, searchTerm, sortBy });
  
  const filteredAndSortedProjections = projectionsData
    .filter(p => {
      const matchesSearch = p.player_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = selectedPosition === 'ALL' || 
        (p.position === selectedPosition) ||
        (selectedPosition === 'FLEX' && ['RB', 'WR', 'TE'].includes(p.position || ''));
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case 'consensus':
          aVal = a.consensus_ppr;
          bVal = b.consensus_ppr;
          break;
        case 'ceiling':
          aVal = a.ceiling_ppr;
          bVal = b.ceiling_ppr;
          break;
        case 'floor':
          aVal = a.floor_ppr;
          bVal = b.floor_ppr;
          break;
        default:
          aVal = a.consensus_ppr;
          bVal = b.consensus_ppr;
      }
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const handleSort = (column: 'consensus' | 'ceiling' | 'floor') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  return (
    <ModernLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            Weekly Projections
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Consensus projections from sharp sportsbooks • PPR Scoring
          </p>
        </div>

        {/* Controls */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          border: '1px solid #f3f4f6'
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Week Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Week
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  minWidth: '100px'
                }}
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>

            {/* Position Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Position
              </label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                <option value="ALL">All Positions</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="FLEX">FLEX (RB/WR/TE)</option>
              </select>
            </div>

            {/* Search */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Refresh Button */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={loadProjections}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Trophy style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Players</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                  {filteredAndSortedProjections.length}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Target style={{ width: '24px', height: '24px', color: '#10b981' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>High Confidence</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                  {filteredAndSortedProjections.filter(p => p.confidence_rating === 'HIGH').length}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Multi-Source</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                  {filteredAndSortedProjections.filter(p => p.num_sources > 1).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projections Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          border: '1px solid #f3f4f6',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280' }}>Loading projections...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      Rank
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      Player
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      Pos
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      Team
                    </th>
                    <th 
                      onClick={() => handleSort('consensus')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        PPR
                        {sortBy === 'consensus' && (
                          sortDirection === 'desc' ? <ChevronDown style={{ width: '14px' }} /> : <ChevronUp style={{ width: '14px' }} />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('floor')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        Floor
                        {sortBy === 'floor' && (
                          sortDirection === 'desc' ? <ChevronDown style={{ width: '14px' }} /> : <ChevronUp style={{ width: '14px' }} />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('ceiling')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        Ceiling
                        {sortBy === 'ceiling' && (
                          sortDirection === 'desc' ? <ChevronDown style={{ width: '14px' }} /> : <ChevronUp style={{ width: '14px' }} />
                        )}
                      </div>
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      Sources
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedProjections.map((player, index) => (
                    <tr 
                      key={`${player.player_name}-${index}`}
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                        {player.player_name}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: `${getPositionColor(player.position)}15`,
                          color: getPositionColor(player.position)
                        }}>
                          {player.position || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {player.team || 'FA'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {player.consensus_ppr.toFixed(1)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                        {player.floor_ppr.toFixed(1)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                        {player.ceiling_ppr.toFixed(1)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: player.num_sources > 1 ? '#3b82f615' : '#6b728015',
                          color: player.num_sources > 1 ? '#3b82f6' : '#6b7280'
                        }}>
                          {player.num_sources}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getConfidenceColor(player.confidence_rating).bg,
                          color: getConfidenceColor(player.confidence_rating).text
                        }}>
                          {player.confidence_rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAndSortedProjections.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <AlertCircle style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                  <p style={{ color: '#6b7280', fontSize: '16px' }}>No projections found</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
                    Try adjusting your filters or search term
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  );
}
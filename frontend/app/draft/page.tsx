'use client';

import React, { useState, useEffect } from 'react';
import ModernLayout from '@/components/ModernLayout';
import { 
  Trophy, 
  Clock, 
  Users, 
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Star,
  TrendingUp,
  Target,
  Shield,
  Zap,
  CheckCircle
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  adp: number;
  projected: number;
  bye: number;
  drafted: boolean;
  draftedBy?: string;
}

interface Team {
  id: string;
  name: string;
  owner: string;
  draftPosition: number;
  picks: Player[];
}

export default function DraftPage() {
  const [draftStarted, setDraftStarted] = useState(false);
  const [currentPick, setCurrentPick] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');

  // Initialize mock data
  useEffect(() => {
    const mockPlayers: Player[] = [
      { id: '1', name: 'Christian McCaffrey', position: 'RB', team: 'SF', adp: 1.2, projected: 385, bye: 9, drafted: false },
      { id: '2', name: 'Justin Jefferson', position: 'WR', team: 'MIN', adp: 2.1, projected: 358, bye: 13, drafted: false },
      { id: '3', name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', adp: 3.5, projected: 342, bye: 7, drafted: false },
      { id: '4', name: 'Tyreek Hill', position: 'WR', team: 'MIA', adp: 4.2, projected: 345, bye: 10, drafted: false },
      { id: '5', name: 'Austin Ekeler', position: 'RB', team: 'LAC', adp: 5.8, projected: 315, bye: 5, drafted: false },
      { id: '6', name: 'Stefon Diggs', position: 'WR', team: 'BUF', adp: 6.3, projected: 328, bye: 13, drafted: false },
      { id: '7', name: 'Bijan Robinson', position: 'RB', team: 'ATL', adp: 7.1, projected: 305, bye: 11, drafted: false },
      { id: '8', name: 'Travis Kelce', position: 'TE', team: 'KC', adp: 8.5, projected: 245, bye: 10, drafted: false },
      { id: '9', name: 'Nick Chubb', position: 'RB', team: 'CLE', adp: 9.2, projected: 295, bye: 5, drafted: false },
      { id: '10', name: 'Josh Allen', position: 'QB', team: 'BUF', adp: 10.8, projected: 412, bye: 13, drafted: false },
    ];

    const mockTeams: Team[] = Array.from({ length: 10 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: i === 0 ? 'Your Team' : `Team ${i + 1}`,
      owner: i === 0 ? 'You' : `Owner ${i + 1}`,
      draftPosition: i + 1,
      picks: []
    }));

    setAvailablePlayers(mockPlayers);
    setTeams(mockTeams);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (draftStarted && timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [draftStarted, timeRemaining]);

  const getCurrentTeam = () => {
    const round = Math.ceil(currentPick / teams.length);
    const pickInRound = ((currentPick - 1) % teams.length) + 1;
    
    // Snake draft logic
    if (round % 2 === 1) {
      return teams[pickInRound - 1];
    } else {
      return teams[teams.length - pickInRound];
    }
  };

  const handleDraftPlayer = (player: Player) => {
    if (!draftStarted || player.drafted) return;

    const currentTeam = getCurrentTeam();
    
    // Update player as drafted
    setAvailablePlayers(prev => prev.map(p => 
      p.id === player.id ? { ...p, drafted: true, draftedBy: currentTeam.name } : p
    ));

    // Add player to team
    setTeams(prev => prev.map(team => 
      team.id === currentTeam.id 
        ? { ...team, picks: [...team.picks, player] }
        : team
    ));

    // Move to next pick
    setCurrentPick(currentPick + 1);
    setTimeRemaining(90);
    setSelectedPlayer(null);
  };

  const filteredPlayers = availablePlayers
    .filter(p => !p.drafted)
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'ALL' || p.position === positionFilter;
      return matchesSearch && matchesPosition;
    });

  const currentTeam = getCurrentTeam();
  const currentRound = Math.ceil(currentPick / teams.length);
  const isMyTurn = currentTeam?.owner === 'You';

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
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            Live Draft Room
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            10-Team Snake Draft • PPR Scoring
          </p>
        </div>

        {/* Draft Status Bar */}
        <div style={{
          background: draftStarted ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>STATUS</p>
                <p style={{ fontSize: '20px', fontWeight: '600' }}>
                  {draftStarted ? 'LIVE' : 'WAITING TO START'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>ROUND</p>
                <p style={{ fontSize: '20px', fontWeight: '600' }}>{currentRound} of 15</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>PICK</p>
                <p style={{ fontSize: '20px', fontWeight: '600' }}>#{currentPick}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>ON THE CLOCK</p>
                <p style={{ fontSize: '20px', fontWeight: '600' }}>
                  {currentTeam?.name || 'Waiting...'}
                  {isMyTurn && ' (YOU)'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>TIME</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock style={{ width: '20px', height: '20px' }} />
                  <p style={{ fontSize: '20px', fontWeight: '600' }}>
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>
            
            {!draftStarted ? (
              <button
                onClick={() => setDraftStarted(true)}
                style={{
                  padding: '12px 32px',
                  backgroundColor: 'white',
                  color: '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Play style={{ width: '20px', height: '20px' }} />
                Start Draft
              </button>
            ) : (
              <button
                onClick={() => setDraftStarted(false)}
                style={{
                  padding: '12px 32px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Pause style={{ width: '20px', height: '20px' }} />
                Pause
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Left Column - Available Players */}
          <div style={{ flex: '2' }}>
            {/* Search and Filters */}
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: '1',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Positions</option>
                  <option value="QB">QB</option>
                  <option value="RB">RB</option>
                  <option value="WR">WR</option>
                  <option value="TE">TE</option>
                </select>
              </div>
            </div>

            {/* Players Grid */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '1px solid #f3f4f6',
              height: '600px',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Available Players
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {filteredPlayers.map(player => (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    style={{
                      padding: '12px',
                      border: selectedPlayer?.id === player.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedPlayer?.id === player.id ? '#eff6ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPlayer?.id !== player.id) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPlayer?.id !== player.id) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{player.name}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: `${getPositionColor(player.position)}15`,
                            color: getPositionColor(player.position)
                          }}>
                            {player.position}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{player.team}</span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>BYE: {player.bye}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>ADP</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{player.adp}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Projected: {player.projected} pts</span>
                      {isMyTurn && selectedPlayer?.id === player.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDraftPlayer(player);
                          }}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Draft
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Draft Order & My Team */}
          <div style={{ flex: '1' }}>
            {/* Draft Order */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '1px solid #f3f4f6',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Draft Order
              </h3>
              {teams.map((team, index) => (
                <div
                  key={team.id}
                  style={{
                    padding: '8px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    backgroundColor: currentTeam?.id === team.id ? '#eff6ff' : 'transparent',
                    border: currentTeam?.id === team.id ? '1px solid #3b82f6' : '1px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280'
                    }}>
                      {index + 1}
                    </span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {team.name}
                        {team.owner === 'You' && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 6px', 
                            backgroundColor: '#10b981', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            YOU
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        {team.picks.length} picks
                      </p>
                    </div>
                  </div>
                  {currentTeam?.id === team.id && (
                    <Clock style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                  )}
                </div>
              ))}
            </div>

            {/* My Team */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                My Team
              </h3>
              {teams[0]?.picks.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
                  No players drafted yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teams[0]?.picks.map((player, index) => (
                    <div
                      key={player.id}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        backgroundColor: '#f9fafb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        R{Math.ceil((index + 1) / teams.length)}.{((index) % teams.length) + 1}
                      </span>
                      <span style={{ fontSize: '14px', color: '#374151' }}>{player.name}</span>
                      <span style={{
                        marginLeft: 'auto',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: `${getPositionColor(player.position)}15`,
                        color: getPositionColor(player.position)
                      }}>
                        {player.position}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
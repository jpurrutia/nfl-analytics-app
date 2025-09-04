'use client';

import React from 'react';
import ModernLayout from '@/components/ModernLayout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trophy, 
  TrendingUp, 
  Plus,
  ArrowUpRight,
  Users,
  Activity,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Sample data for charts
const performanceData = [
  { week: 'W1', points: 112, projected: 105 },
  { week: 'W2', points: 128, projected: 120 },
  { week: 'W3', points: 98, projected: 115 },
  { week: 'W4', points: 142, projected: 125 },
  { week: 'W5', points: 135, projected: 130 },
  { week: 'W6', points: 155, projected: 135 },
  { week: 'W7', points: 148, projected: 140 },
];

const positionData = [
  { position: 'QB', points: 285, players: 2 },
  { position: 'RB', points: 412, players: 4 },
  { position: 'WR', points: 523, players: 5 },
  { position: 'TE', points: 189, players: 2 },
  { position: 'K', points: 98, players: 1 },
  { position: 'DEF', points: 112, players: 1 },
];

const recentActivity = [
  { id: 1, type: 'draft', message: 'Drafted Christian McCaffrey', time: '2 hours ago' },
  { id: 2, type: 'trade', message: 'Trade proposal received', time: '5 hours ago' },
  { id: 3, type: 'waiver', message: 'Waiver claim processed', time: '1 day ago' },
  { id: 4, type: 'lineup', message: 'Lineup optimized for Week 7', time: '2 days ago' },
];

export default function ModernDashboardPage() {
  const { user } = useAuth();

  return (
    <ModernLayout>
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Hero Card - Clean and Modern */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          <div style={{ 
            height: '4px', 
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' 
          }}></div>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  Welcome back, {user?.first_name || 'Juan'}! 👋
                </h1>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
                  Your team is currently ranked #3 in the Championship League
                </p>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#dbeafe', 
                      borderRadius: '8px' 
                    }}>
                      <Trophy className="w-5 h-5" style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Record</p>
                      <p className="text-sm font-semibold text-gray-900">8-2</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#d1fae5', 
                      borderRadius: '8px' 
                    }}>
                      <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Win Streak</p>
                      <p className="text-sm font-semibold text-gray-900">3 Games</p>
                    </div>
                  </div>
                </div>
              </div>
              <button style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px 0 rgba(37,99,235,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Plus className="w-5 h-5" />
                New Draft
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section - Force Horizontal Layout with Inline Styles */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
          {/* League Rank */}
          <div style={{ flex: '1', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6' }}>
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">League Rank</p>
              <p className="text-3xl font-bold text-gray-900">#3</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-600">+2% vs last week</span>
              </div>
            </div>
          </div>
          {/* Active Drafts */}
          <div style={{ flex: '1', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6' }}>
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Drafts</p>
              <p className="text-3xl font-bold text-gray-900">2</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-600">+12%</span>
              </div>
            </div>
          </div>
          {/* Next Game */}
          <div style={{ flex: '1', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6' }}>
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Next Game</p>
              <p className="text-3xl font-bold text-gray-900">Sun 1PM</p>
              <p className="text-sm text-gray-600 mt-2">vs Eagles</p>
            </div>
          </div>
          {/* Win Probability */}
          <div style={{ flex: '1', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6' }}>
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Win Probability</p>
              <p className="text-3xl font-bold text-gray-900">72%</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-600">+8% this week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ marginTop: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Analytics & Performance</h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Large Line Chart - 2/3 width */}
            <div style={{ 
              flex: '2', 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)', 
              padding: '24px',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Season Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="points"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorPoints)"
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
          </div>

            {/* Bar Chart - 1/3 width */}
            <div style={{ 
              flex: '1', 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)', 
              padding: '24px',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Points by Position</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={positionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="position" 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="points" 
                    fill="#2563eb" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <Button variant="subtle" size="sm">
                View All
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity) => (
              <div key={activity.id} style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: activity.type === 'draft' ? '#dbeafe' : 
                                   activity.type === 'trade' ? '#e9d5ff' :
                                   activity.type === 'waiver' ? '#d1fae5' : '#fed7aa',
                    color: activity.type === 'draft' ? '#2563eb' : 
                          activity.type === 'trade' ? '#9333ea' :
                          activity.type === 'waiver' ? '#10b981' : '#ea580c'
                  }}>
                    {activity.type === 'draft' && <Trophy className="w-5 h-5" />}
                    {activity.type === 'trade' && <Users className="w-5 h-5" />}
                    {activity.type === 'waiver' && <Activity className="w-5 h-5" />}
                    {activity.type === 'lineup' && <Target className="w-5 h-5" />}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{activity.message}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{activity.time}</p>
                  </div>
                </div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}>
                  <ArrowUpRight className="w-4 h-4" style={{ color: '#6b7280' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
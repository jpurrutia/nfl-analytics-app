'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Trophy,
  TrendingUp,
  Settings,
  Shield,
  Bell,
  Search,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ModernLayoutProps {
  children: React.ReactNode;
}

export default function ModernLayout({ children }: ModernLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Players', href: '/players', icon: Users },
    { name: 'Draft', href: '/draft', icon: Trophy },
    { name: 'Leagues', href: '/leagues', icon: Shield },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f7f8fb' }}>
      {/* Sidebar - Clean and Modern */}
      <aside style={{
        width: '250px',
        backgroundColor: 'white',
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 40
      }}>
        {/* Logo Section */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Trophy style={{ width: '32px', height: '32px', color: '#2563eb' }} />
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>NFL Analytics</span>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '16px' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? '#2563eb' : 'transparent',
                  color: isActive ? 'white' : '#6b7280'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <Icon style={{ width: '20px', height: '20px', marginRight: '12px' }} />
                {item.name}
                {isActive && (
                  <ChevronRight style={{ width: '16px', height: '16px', marginLeft: 'auto' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {user && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                {user.first_name?.[0]?.toUpperCase()}
              </div>
              <div style={{ marginLeft: '12px', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {user.first_name} {user.last_name}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                color: '#ef4444',
                backgroundColor: 'transparent',
                border: '1px solid #fee2e2',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div style={{ 
        marginLeft: '250px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header Bar */}
        <header style={{
          height: '64px',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: '500px' }}>
            <div style={{ position: 'relative' }}>
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
                placeholder="Search..."
                style={{
                  width: '100%',
                  paddingLeft: '44px',
                  paddingRight: '16px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
              />
            </div>
          </div>

          {/* Right Side Items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notifications */}
            <button style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            >
              <Bell style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                border: '2px solid white'
              }}></span>
            </button>

            {/* User Avatar and Name */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                {user?.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {user?.first_name || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ 
          flex: 1,
          padding: '32px',
          overflow: 'auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
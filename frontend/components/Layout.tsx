'use client';

import React, { useState } from 'react';
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
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Players', href: '/players', icon: Users },
    { name: 'Draft', href: '/draft', icon: Trophy },
    { name: 'Leagues', href: '/leagues', icon: Shield },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  ];

  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="h-full bg-white border-r border-gray-200 shadow-lg flex flex-col">
          {/* Logo Section */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Link 
              href="/" 
              className={cn(
                "flex items-center space-x-3 transition-opacity",
                !sidebarOpen && "opacity-0"
              )}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NFL Analytics
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* User Profile Section */}
          {user && (
            <div 
              className={cn(
                "px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50",
                !sidebarOpen && "px-2"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.first_name?.[0]?.toUpperCase() || 'U'}
                </div>
                {sidebarOpen && (
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md" 
                        : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "flex-shrink-0",
                        sidebarOpen ? "w-5 h-5 mr-3" : "w-5 h-5 mx-auto"
                      )} 
                    />
                    {sidebarOpen && (
                      <React.Fragment>
                        <span className="flex-1 font-medium">{item.name}</span>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 opacity-80" />
                        )}
                      </React.Fragment>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-auto pt-4 border-t border-gray-100 space-y-1">
              {bottomNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center px-3 py-2.5 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-200"
                  >
                    <Icon 
                      className={cn(
                        "flex-shrink-0",
                        sidebarOpen ? "w-5 h-5 mr-3" : "w-5 h-5 mx-auto"
                      )} 
                    />
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  </Link>
                );
              })}
              
              {user && (
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center px-3 py-2.5 rounded-xl hover:bg-red-50 text-gray-700 hover:text-red-600 transition-all duration-200"
                >
                  <LogOut 
                    className={cn(
                      "flex-shrink-0",
                      sidebarOpen ? "w-5 h-5 mr-3" : "w-5 h-5 mx-auto"
                    )} 
                  />
                  {sidebarOpen && <span className="font-medium">Logout</span>}
                </button>
              )}
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="w-px h-8 bg-gray-200" />
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200">
                  + New Draft
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
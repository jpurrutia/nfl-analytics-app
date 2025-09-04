'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Start Draft Session',
      description: 'Begin a new mock draft with AI recommendations',
      href: '/draft/new',
      icon: '📋',
      color: 'bg-blue-500',
    },
    {
      title: 'View Players',
      description: 'Browse player analytics and projections',
      href: '/players',
      icon: '📊',
      color: 'bg-green-500',
    },
    {
      title: 'Connect League',
      description: 'Import your ESPN fantasy league',
      href: '/leagues/connect',
      icon: '🔗',
      color: 'bg-purple-500',
    },
    {
      title: 'Recent Drafts',
      description: 'Review your draft history',
      href: '/draft',
      icon: '📝',
      color: 'bg-orange-500',
    },
  ];

  const stats = [
    { label: 'Active Drafts', value: '2', change: '+1 from last week' },
    { label: 'Players Analyzed', value: '847', change: '+123 new' },
    { label: 'Leagues Connected', value: '3', change: 'All synced' },
    { label: 'Recommendations', value: '98%', change: 'Accuracy rate' },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.username}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's your fantasy football command center
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.label}
                </dt>
                <dd className="mt-1">
                  <div className="text-3xl font-semibold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.change}</div>
                </dd>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="relative group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div>
                  <span
                    className={`rounded-lg inline-flex p-3 ${action.color} text-white text-2xl`}
                  >
                    {action.icon}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">{action.description}</p>
                </div>
                <span
                  className="absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Drafted Christian McCaffrey
                    </p>
                    <p className="text-sm text-gray-500">
                      Mock Draft - Round 1, Pick 2
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      New player projections available
                    </p>
                    <p className="text-sm text-gray-500">
                      Week 1 data has been updated
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">5 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔗</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      League synchronized
                    </p>
                    <p className="text-sm text-gray-500">
                      "Championship League" data updated
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Draft session completed
                    </p>
                    <p className="text-sm text-gray-500">
                      12-team PPR mock draft finished
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">2 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import PlayerTable from '@/components/PlayerTable';
import SearchBar from '@/components/SearchBar';
import { players as playersApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function PlayersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [scoringType, setScoringType] = useState('PPR');
  const limit = 50;

  // Fetch players data
  const { data, isLoading, error } = useQuery({
    queryKey: ['players', page, searchQuery, scoringType],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
        scoring_type: scoringType,
      };
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await playersApi.list(params);
      return response.data;
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page on search
  };

  const handlePlayerClick = (player: any) => {
    // Could open a modal or navigate to player detail
    console.log('Player clicked:', player);
  };

  if (error) {
    toast.error('Failed to load players');
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Player Analytics</h1>
          <p className="mt-2 text-gray-600">
            Browse player projections, metrics, and advanced analytics
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search by name or team..."
              />
            </div>

            {/* Scoring Type */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Scoring:</label>
              <select
                value={scoringType}
                onChange={(e) => setScoringType(e.target.value)}
                className="block w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="PPR">PPR</option>
                <option value="HALF_PPR">Half PPR</option>
                <option value="STANDARD">Standard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {data && !isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Players
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {data.total || 0}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg Projection
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {data.players?.reduce((acc: number, p: any) => acc + p.projection, 0) / (data.players?.length || 1) || 0}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Top Consistency
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {Math.max(...(data.players?.map((p: any) => p.consistency) || [0])).toFixed(0)}%
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Data Updated
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  Today
                </dd>
              </div>
            </div>
          </div>
        )}

        {/* Player Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <PlayerTable
              players={data?.players || []}
              onPlayerClick={handlePlayerClick}
              loading={isLoading}
            />
          </div>
        </div>

        {/* Pagination */}
        {data && data.total > limit && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {[...Array(Math.ceil(data.total / limit))].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === Math.ceil(data.total / limit) ||
                  (pageNum >= page - 2 && pageNum <= page + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === page - 3 || pageNum === page + 3) {
                  return <span key={pageNum} className="px-2">...</span>;
                }
                return null;
              })}
              
              <button
                onClick={() => setPage(Math.min(Math.ceil(data.total / limit), page + 1))}
                disabled={page === Math.ceil(data.total / limit)}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </Layout>
  );
}
import axios, { AxiosInstance } from 'axios';

// Direct backend API client for public endpoints
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const backendApi: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export interface PlayerProjection {
  player_name: string;
  position?: string;
  team?: string;
  consensus_ppr: number;
  consensus_standard: number;
  floor_ppr: number;
  ceiling_ppr: number;
  betonline_proj?: number;
  pinnacle_proj?: number;
  passing_yards?: number;
  passing_tds?: number;
  rushing_yards?: number;
  rushing_tds?: number;
  receiving_yards?: number;
  receiving_tds?: number;
  receptions?: number;
  num_sources: number;
  projection_std_dev?: number;
  confidence_rating: string;
  has_props: boolean;
}

export interface ProjectionsResponse {
  projections: PlayerProjection[];
  week: number;
  season: number;
  count: number;
}

// Projections endpoints (public, no auth required)
export const projections = {
  // Get projections for a week
  getWeekly: async (week: number = 1, season: number = 2025, limit: number = 50, position?: string) => {
    const params: any = { week, season, limit };
    if (position) params.position = position;
    
    const response = await backendApi.get<ProjectionsResponse>('/api/projections', { params });
    return response.data;
  },
  
  // Get projection for specific player
  getPlayer: async (playerName: string, week: number = 1, season: number = 2025) => {
    const response = await backendApi.get<PlayerProjection>(
      `/api/projections/player/${encodeURIComponent(playerName)}`,
      { params: { week, season } }
    );
    return response.data;
  },
  
  // Search for players by name (using projections data)
  searchPlayers: async (query: string, week: number = 1, season: number = 2025) => {
    const response = await backendApi.get<ProjectionsResponse>('/api/projections', {
      params: { week, season, limit: 100 }
    });
    
    // Client-side filtering for search
    const filtered = response.data.projections.filter(p => 
      p.player_name.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      ...response.data,
      projections: filtered,
      count: filtered.length
    };
  }
};

export default backendApi;
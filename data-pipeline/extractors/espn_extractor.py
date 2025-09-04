"""
ESPN Fantasy Football Data Extractor
Extracts league data from ESPN Fantasy API with authentication support
"""

import logging
import requests
import time
from typing import Dict, List, Optional, Any
import pandas as pd
from datetime import datetime

logger = logging.getLogger(__name__)


class ESPNExtractor:
    """
    Extracts data from ESPN Fantasy Football API.
    Supports both public and private leagues with cookie authentication.
    """
    
    BASE_URL = "https://fantasy.espn.com/apis/v3/games/ffl"
    
    def __init__(self, league_id: str, year: int = 2023, 
                 swid: Optional[str] = None, espn_s2: Optional[str] = None):
        """
        Initialize the ESPN extractor.
        
        Args:
            league_id: ESPN league ID
            year: Season year
            swid: SWID cookie value (for private leagues)
            espn_s2: ESPN S2 cookie value (for private leagues)
        """
        self.league_id = league_id
        self.year = year
        self.swid = swid
        self.espn_s2 = espn_s2
        
        # Setup session with cookies if provided
        self.session = requests.Session()
        if swid and espn_s2:
            self.session.cookies.set('SWID', f'{{{swid}}}', domain='.espn.com')
            self.session.cookies.set('espn_s2', espn_s2, domain='.espn.com')
            logger.info(f"Authenticated session created for league {league_id}")
        else:
            logger.info(f"Public session created for league {league_id}")
    
    def get_league_info(self) -> Dict[str, Any]:
        """
        Fetch basic league information.
        
        Returns:
            Dictionary with league settings and metadata
        """
        url = f"{self.BASE_URL}/seasons/{self.year}/segments/0/leagues/{self.league_id}"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Successfully fetched league info for {self.league_id}")
            
            return {
                'id': data.get('id'),
                'name': data.get('settings', {}).get('name'),
                'season': self.year,
                'teams_count': len(data.get('teams', [])),
                'scoring_type': self._detect_scoring_format(data.get('settings', {})),
                'is_active': data.get('status', {}).get('isActive', False),
                'current_week': data.get('status', {}).get('currentMatchupPeriod', 0)
            }
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                logger.error("Authentication failed - private league requires valid SWID and espn_s2 cookies")
            elif e.response.status_code == 404:
                logger.error(f"League {self.league_id} not found")
            else:
                logger.error(f"HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to fetch league info: {e}")
            raise
    
    def get_rosters(self, week: Optional[int] = None) -> pd.DataFrame:
        """
        Fetch all team rosters.
        
        Args:
            week: Specific week to fetch (None for current)
            
        Returns:
            DataFrame with roster information
        """
        url = f"{self.BASE_URL}/seasons/{self.year}/segments/0/leagues/{self.league_id}"
        params = {
            'view': 'mRoster',
            'scoringPeriodId': week if week else 0
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        rosters = []
        for team in data.get('teams', []):
            team_id = team.get('id')
            team_name = f"{team.get('location', '')} {team.get('nickname', '')}".strip()
            
            for player in team.get('roster', {}).get('entries', []):
                player_info = player.get('playerPoolEntry', {}).get('player', {})
                
                rosters.append({
                    'team_id': team_id,
                    'team_name': team_name,
                    'player_id': player_info.get('id'),
                    'player_name': player_info.get('fullName'),
                    'position': self._get_position(player_info),
                    'pro_team': self._get_pro_team(player_info),
                    'status': player_info.get('injuryStatus', 'ACTIVE'),
                    'lineup_slot': player.get('lineupSlotId'),
                    'acquisition_type': player.get('acquisitionType')
                })
        
        df = pd.DataFrame(rosters)
        logger.info(f"Fetched {len(df)} roster entries across {df['team_id'].nunique()} teams")
        
        return df
    
    def get_available_players(self, size: int = 200) -> pd.DataFrame:
        """
        Fetch available free agents and waiver wire players.
        
        Args:
            size: Number of players to fetch
            
        Returns:
            DataFrame with available players
        """
        url = f"{self.BASE_URL}/seasons/{self.year}/segments/0/leagues/{self.league_id}"
        
        params = {
            'view': 'kona_player_info',
            'scoringPeriodId': 0,
            'limit': size,
            'offset': 0
        }
        
        # Filter for available players
        headers = {
            'x-fantasy-filter': '{"players":{"filterStatus":{"value":["FREEAGENT","WAIVERS"]},"limit":' + str(size) + ',"sortPercOwned":{"sortAsc":false,"sortPriority":1}}}'
        }
        
        response = self.session.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        available = []
        for player in data.get('players', []):
            player_info = player.get('player', {})
            
            available.append({
                'player_id': player.get('id'),
                'player_name': player_info.get('fullName'),
                'position': self._get_position(player_info),
                'pro_team': self._get_pro_team(player_info),
                'percent_owned': player_info.get('ownership', {}).get('percentOwned', 0),
                'percent_started': player_info.get('ownership', {}).get('percentStarted', 0),
                'adp': player_info.get('ownership', {}).get('averageDraftPosition', 999),
                'status': player_info.get('injuryStatus', 'ACTIVE')
            })
        
        df = pd.DataFrame(available)
        logger.info(f"Found {len(df)} available players")
        
        return df
    
    def get_matchups(self, week: int) -> pd.DataFrame:
        """
        Fetch matchup data for a specific week.
        
        Args:
            week: Week number
            
        Returns:
            DataFrame with matchup information
        """
        url = f"{self.BASE_URL}/seasons/{self.year}/segments/0/leagues/{self.league_id}"
        params = {
            'view': 'mMatchup',
            'scoringPeriodId': week
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        matchups = []
        for matchup in data.get('schedule', []):
            if matchup.get('matchupPeriodId') == week:
                matchups.append({
                    'week': week,
                    'home_team_id': matchup.get('home', {}).get('teamId'),
                    'away_team_id': matchup.get('away', {}).get('teamId'),
                    'home_score': matchup.get('home', {}).get('totalPoints', 0),
                    'away_score': matchup.get('away', {}).get('totalPoints', 0),
                    'is_complete': matchup.get('winner') is not None,
                    'winner': matchup.get('winner')
                })
        
        df = pd.DataFrame(matchups)
        logger.info(f"Fetched {len(df)} matchups for week {week}")
        
        return df
    
    def get_player_stats(self, week: Optional[int] = None) -> pd.DataFrame:
        """
        Fetch player statistics.
        
        Args:
            week: Specific week (None for season totals)
            
        Returns:
            DataFrame with player statistics
        """
        url = f"{self.BASE_URL}/seasons/{self.year}/segments/0/leagues/{self.league_id}"
        params = {
            'view': 'mMatchup',
            'scoringPeriodId': week if week else 0
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        stats = []
        for team in data.get('teams', []):
            for player in team.get('roster', {}).get('entries', []):
                player_info = player.get('playerPoolEntry', {}).get('player', {})
                player_stats = player_info.get('stats', [])
                
                for stat in player_stats:
                    if stat.get('scoringPeriodId') == week or week is None:
                        stats.append({
                            'player_id': player_info.get('id'),
                            'player_name': player_info.get('fullName'),
                            'week': stat.get('scoringPeriodId', 0),
                            'points': stat.get('appliedTotal', 0),
                            'projected': stat.get('appliedProjectedTotal', 0)
                        })
        
        df = pd.DataFrame(stats)
        logger.info(f"Fetched stats for {df['player_id'].nunique()} players")
        
        return df
    
    def _detect_scoring_format(self, settings: Dict) -> str:
        """Detect the league's scoring format."""
        scoring_items = settings.get('scoringSettings', {}).get('scoringItems', [])
        
        for item in scoring_items:
            if item.get('statId') == 53:  # Reception points
                points = item.get('pointsOverrides', {}).get('16', 0)  # 16 is default scoring
                if points == 1.0:
                    return 'PPR'
                elif points == 0.5:
                    return 'Half-PPR'
        
        return 'Standard'
    
    def _get_position(self, player_info: Dict) -> str:
        """Get player position."""
        pos_id = player_info.get('defaultPositionId', 0)
        positions = {
            1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE',
            5: 'K', 16: 'DST'
        }
        return positions.get(pos_id, 'UNKNOWN')
    
    def _get_pro_team(self, player_info: Dict) -> str:
        """Get player's NFL team."""
        team_id = player_info.get('proTeamId', 0)
        # This would map to actual team abbreviations
        # For now, return the ID
        return str(team_id)


# Example usage
if __name__ == "__main__":
    # Example with authentication for private league
    LEAGUE_ID = "your-league-id"
    SWID = "your-swid-without-curly-braces"
    ESPN_S2 = "your-espn-s2-cookie"
    
    # Create extractor with authentication
    extractor = ESPNExtractor(
        league_id=LEAGUE_ID,
        year=2023,
        swid=SWID,
        espn_s2=ESPN_S2
    )
    
    # Get league info
    try:
        info = extractor.get_league_info()
        print(f"League: {info['name']}")
        print(f"Scoring: {info['scoring_type']}")
        print(f"Current Week: {info['current_week']}")
        
        # Get rosters
        rosters = extractor.get_rosters()
        print(f"\nTotal roster spots: {len(rosters)}")
        
        # Get available players
        available = extractor.get_available_players(size=50)
        print(f"\nTop available players:")
        print(available.head(10)[['player_name', 'position', 'percent_owned']])
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nIf this is a private league, make sure you provided valid SWID and espn_s2 cookies")
        print("Follow the instructions in docs/ESPN_AUTHENTICATION.md")
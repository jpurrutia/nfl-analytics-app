"""
Red Zone Metrics Calculator
Calculates red zone efficiency, touchdown rates, and scoring opportunities
"""

import logging
from typing import Dict, List, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class RedZoneCalculator:
    """
    Calculates red zone performance metrics for players and teams.
    Red zone is defined as plays within 20 yards of the opponent's end zone.
    """
    
    # Red zone yardline threshold
    RED_ZONE_THRESHOLD = 20
    
    # Goal line threshold (for goal-to-go situations)
    GOAL_LINE_THRESHOLD = 5
    
    def __init__(self):
        """Initialize the red zone calculator."""
        logger.info("Red zone metrics calculator initialized")
    
    def is_red_zone_play(self, yardline_100: int) -> bool:
        """
        Check if a play is in the red zone.
        
        Args:
            yardline_100: Yards from opponent's end zone
            
        Returns:
            True if in red zone
        """
        return yardline_100 <= self.RED_ZONE_THRESHOLD
    
    def is_goal_line_play(self, yardline_100: int) -> bool:
        """
        Check if a play is at the goal line.
        
        Args:
            yardline_100: Yards from opponent's end zone
            
        Returns:
            True if at goal line
        """
        return yardline_100 <= self.GOAL_LINE_THRESHOLD
    
    def calculate_red_zone_efficiency(self, touchdowns: int, opportunities: int) -> float:
        """
        Calculate red zone touchdown conversion rate.
        
        Args:
            touchdowns: Number of red zone touchdowns
            opportunities: Number of red zone opportunities
            
        Returns:
            Red zone efficiency percentage
        """
        if opportunities <= 0:
            return 0.0
        
        return round((touchdowns / opportunities) * 100, 2)
    
    def calculate_player_red_zone_metrics(self, df: pd.DataFrame,
                                         player_id: str) -> Dict:
        """
        Calculate red zone metrics for a specific player.
        
        Args:
            df: DataFrame with play-by-play data
            player_id: Player to analyze
            
        Returns:
            Dictionary with red zone metrics
        """
        # Filter for player and red zone
        player_df = df[df['player_id'] == player_id]
        
        if 'yardline_100' not in df.columns:
            logger.warning("No yardline data available for red zone calculation")
            return {}
        
        rz_df = player_df[player_df['yardline_100'] <= self.RED_ZONE_THRESHOLD]
        gl_df = player_df[player_df['yardline_100'] <= self.GOAL_LINE_THRESHOLD]
        
        metrics = {
            'player_id': player_id,
            'player_name': player_df['player_name'].iloc[0] if 'player_name' in player_df and not player_df.empty else player_id,
            'position': player_df['position'].iloc[0] if 'position' in player_df and not player_df.empty else None,
            'games_played': player_df['game_id'].nunique() if 'game_id' in player_df else 0
        }
        
        # Get position to determine relevant metrics
        position = metrics['position']
        
        if position in ['QB']:
            # QB metrics
            metrics.update(self._calculate_qb_red_zone_metrics(rz_df, gl_df))
        elif position in ['RB', 'FB']:
            # RB metrics
            metrics.update(self._calculate_rb_red_zone_metrics(rz_df, gl_df))
        elif position in ['WR', 'TE']:
            # Pass catcher metrics
            metrics.update(self._calculate_receiver_red_zone_metrics(rz_df, gl_df))
        
        return metrics
    
    def _calculate_qb_red_zone_metrics(self, rz_df: pd.DataFrame, 
                                      gl_df: pd.DataFrame) -> Dict:
        """Calculate QB-specific red zone metrics."""
        metrics = {}
        
        # Red zone passing
        rz_attempts = rz_df['pass_attempt'].sum() if 'pass_attempt' in rz_df else 0
        rz_completions = rz_df['complete_pass'].sum() if 'complete_pass' in rz_df else 0
        rz_pass_tds = rz_df['pass_touchdown'].sum() if 'pass_touchdown' in rz_df else 0
        
        metrics['red_zone_attempts'] = int(rz_attempts)
        metrics['red_zone_completions'] = int(rz_completions)
        metrics['red_zone_passing_tds'] = int(rz_pass_tds)
        metrics['red_zone_completion_pct'] = round(
            (rz_completions / rz_attempts * 100) if rz_attempts > 0 else 0, 2
        )
        metrics['red_zone_td_rate'] = self.calculate_red_zone_efficiency(rz_pass_tds, rz_attempts)
        
        # Goal line passing
        gl_attempts = gl_df['pass_attempt'].sum() if 'pass_attempt' in gl_df else 0
        gl_pass_tds = gl_df['pass_touchdown'].sum() if 'pass_touchdown' in gl_df else 0
        
        metrics['goal_line_attempts'] = int(gl_attempts)
        metrics['goal_line_passing_tds'] = int(gl_pass_tds)
        metrics['goal_line_td_rate'] = self.calculate_red_zone_efficiency(gl_pass_tds, gl_attempts)
        
        # Rushing stats for QBs
        rz_rush_attempts = rz_df['rush_attempt'].sum() if 'rush_attempt' in rz_df else 0
        rz_rush_tds = rz_df['rush_touchdown'].sum() if 'rush_touchdown' in rz_df else 0
        
        metrics['red_zone_rush_attempts'] = int(rz_rush_attempts)
        metrics['red_zone_rushing_tds'] = int(rz_rush_tds)
        
        return metrics
    
    def _calculate_rb_red_zone_metrics(self, rz_df: pd.DataFrame,
                                      gl_df: pd.DataFrame) -> Dict:
        """Calculate RB-specific red zone metrics."""
        metrics = {}
        
        # Red zone rushing
        rz_carries = rz_df['rush_attempt'].sum() if 'rush_attempt' in rz_df else 0
        rz_rush_tds = rz_df['rush_touchdown'].sum() if 'rush_touchdown' in rz_df else 0
        rz_rush_yards = rz_df['rushing_yards'].sum() if 'rushing_yards' in rz_df else 0
        
        metrics['red_zone_carries'] = int(rz_carries)
        metrics['red_zone_rushing_tds'] = int(rz_rush_tds)
        metrics['red_zone_rushing_yards'] = round(rz_rush_yards, 1)
        metrics['red_zone_yards_per_carry'] = round(
            (rz_rush_yards / rz_carries) if rz_carries > 0 else 0, 2
        )
        metrics['red_zone_td_rate'] = self.calculate_red_zone_efficiency(rz_rush_tds, rz_carries)
        
        # Goal line rushing
        gl_carries = gl_df['rush_attempt'].sum() if 'rush_attempt' in gl_df else 0
        gl_rush_tds = gl_df['rush_touchdown'].sum() if 'rush_touchdown' in gl_df else 0
        
        metrics['goal_line_carries'] = int(gl_carries)
        metrics['goal_line_rushing_tds'] = int(gl_rush_tds)
        metrics['goal_line_td_rate'] = self.calculate_red_zone_efficiency(gl_rush_tds, gl_carries)
        
        # Red zone receiving
        rz_targets = rz_df['pass_attempt'].sum() if 'pass_attempt' in rz_df else 0
        rz_receptions = rz_df['complete_pass'].sum() if 'complete_pass' in rz_df else 0
        rz_rec_tds = rz_df['pass_touchdown'].sum() if 'pass_touchdown' in rz_df else 0
        
        metrics['red_zone_targets'] = int(rz_targets)
        metrics['red_zone_receptions'] = int(rz_receptions)
        metrics['red_zone_receiving_tds'] = int(rz_rec_tds)
        
        # Total red zone touches
        metrics['red_zone_touches'] = metrics['red_zone_carries'] + metrics['red_zone_receptions']
        metrics['red_zone_total_tds'] = metrics['red_zone_rushing_tds'] + metrics['red_zone_receiving_tds']
        
        return metrics
    
    def _calculate_receiver_red_zone_metrics(self, rz_df: pd.DataFrame,
                                            gl_df: pd.DataFrame) -> Dict:
        """Calculate WR/TE-specific red zone metrics."""
        metrics = {}
        
        # Red zone receiving
        rz_targets = len(rz_df[rz_df['pass_attempt'] == 1]) if 'pass_attempt' in rz_df else 0
        rz_receptions = len(rz_df[rz_df['complete_pass'] == 1]) if 'complete_pass' in rz_df else 0
        rz_rec_tds = rz_df['pass_touchdown'].sum() if 'pass_touchdown' in rz_df else 0
        rz_rec_yards = rz_df['receiving_yards'].sum() if 'receiving_yards' in rz_df else 0
        
        metrics['red_zone_targets'] = int(rz_targets)
        metrics['red_zone_receptions'] = int(rz_receptions)
        metrics['red_zone_receiving_tds'] = int(rz_rec_tds)
        metrics['red_zone_receiving_yards'] = round(rz_rec_yards, 1)
        metrics['red_zone_catch_rate'] = round(
            (rz_receptions / rz_targets * 100) if rz_targets > 0 else 0, 2
        )
        metrics['red_zone_td_rate'] = self.calculate_red_zone_efficiency(rz_rec_tds, rz_targets)
        
        # Goal line receiving
        gl_targets = len(gl_df[gl_df['pass_attempt'] == 1]) if 'pass_attempt' in gl_df else 0
        gl_rec_tds = gl_df['pass_touchdown'].sum() if 'pass_touchdown' in gl_df else 0
        
        metrics['goal_line_targets'] = int(gl_targets)
        metrics['goal_line_receiving_tds'] = int(gl_rec_tds)
        metrics['goal_line_td_rate'] = self.calculate_red_zone_efficiency(gl_rec_tds, gl_targets)
        
        return metrics
    
    def calculate_team_red_zone_metrics(self, df: pd.DataFrame,
                                       team: str,
                                       season: Optional[int] = None) -> Dict:
        """
        Calculate red zone metrics for a team.
        
        Args:
            df: DataFrame with play-by-play data
            team: Team abbreviation
            season: Optional season filter
            
        Returns:
            Dictionary with team red zone metrics
        """
        # Filter for team
        team_df = df[df['posteam'] == team]
        
        if season:
            team_df = team_df[team_df['season'] == season]
        
        if 'yardline_100' not in team_df.columns:
            logger.warning("No yardline data for team red zone calculation")
            return {}
        
        # Red zone plays
        rz_df = team_df[team_df['yardline_100'] <= self.RED_ZONE_THRESHOLD]
        
        # Calculate drives that reached red zone
        rz_drives = rz_df['drive'].nunique() if 'drive' in rz_df else 0
        
        # Calculate scoring
        rz_tds = (
            rz_df['touchdown'].sum() if 'touchdown' in rz_df 
            else rz_df['rush_touchdown'].sum() + rz_df['pass_touchdown'].sum()
        )
        rz_fgs = rz_df['field_goal_result'].value_counts().get('made', 0) if 'field_goal_result' in rz_df else 0
        
        metrics = {
            'team': team,
            'season': season,
            'red_zone_drives': int(rz_drives),
            'red_zone_touchdowns': int(rz_tds),
            'red_zone_field_goals': int(rz_fgs),
            'red_zone_scoring_pct': round(
                ((rz_tds + rz_fgs) / rz_drives * 100) if rz_drives > 0 else 0, 2
            ),
            'red_zone_td_pct': self.calculate_red_zone_efficiency(rz_tds, rz_drives)
        }
        
        # Breakdown by play type
        rz_pass_plays = rz_df['pass_attempt'].sum() if 'pass_attempt' in rz_df else 0
        rz_run_plays = rz_df['rush_attempt'].sum() if 'rush_attempt' in rz_df else 0
        
        metrics['red_zone_pass_pct'] = round(
            (rz_pass_plays / (rz_pass_plays + rz_run_plays) * 100) 
            if (rz_pass_plays + rz_run_plays) > 0 else 0, 2
        )
        metrics['red_zone_run_pct'] = round(
            (rz_run_plays / (rz_pass_plays + rz_run_plays) * 100)
            if (rz_pass_plays + rz_run_plays) > 0 else 0, 2
        )
        
        return metrics
    
    def calculate_for_multiple_players(self, df: pd.DataFrame,
                                      player_list: Optional[List[str]] = None,
                                      min_opportunities: int = 5) -> pd.DataFrame:
        """
        Calculate red zone metrics for multiple players.
        
        Args:
            df: DataFrame with play-by-play data
            player_list: Optional list of player IDs to analyze
            min_opportunities: Minimum red zone opportunities to include
            
        Returns:
            DataFrame with red zone metrics for each player
        """
        if 'yardline_100' not in df.columns:
            logger.error("No yardline data for red zone calculations")
            return pd.DataFrame()
        
        # Get red zone plays
        rz_df = df[df['yardline_100'] <= self.RED_ZONE_THRESHOLD]
        
        # Identify players if not provided
        if player_list is None:
            # Get players with meaningful red zone involvement
            player_columns = ['passer_player_id', 'rusher_player_id', 'receiver_player_id']
            player_list = []
            for col in player_columns:
                if col in rz_df.columns:
                    players = rz_df[col].dropna().unique()
                    player_list.extend(players)
            player_list = list(set(player_list))
        
        results = []
        for player_id in player_list:
            # Get player's red zone plays
            player_rz_plays = rz_df[
                (rz_df.get('passer_player_id') == player_id) |
                (rz_df.get('rusher_player_id') == player_id) |
                (rz_df.get('receiver_player_id') == player_id)
            ]
            
            if len(player_rz_plays) < min_opportunities:
                continue
            
            metrics = self.calculate_player_red_zone_metrics(df, player_id)
            if metrics:
                results.append(metrics)
        
        if results:
            return pd.DataFrame(results)
        else:
            return pd.DataFrame()
    
    def calculate_red_zone_market_share(self, df: pd.DataFrame,
                                       position_filter: Optional[str] = None) -> pd.DataFrame:
        """
        Calculate each player's share of team red zone opportunities.
        
        Args:
            df: DataFrame with player stats
            position_filter: Optional position to filter
            
        Returns:
            DataFrame with red zone market share
        """
        if position_filter:
            df = df[df['position'] == position_filter]
        
        results = []
        
        # Group by team to calculate team totals
        for team, team_df in df.groupby('team'):
            team_rz_touches = team_df['red_zone_touches'].sum() if 'red_zone_touches' in team_df else 0
            team_rz_targets = team_df['red_zone_targets'].sum() if 'red_zone_targets' in team_df else 0
            team_rz_carries = team_df['red_zone_carries'].sum() if 'red_zone_carries' in team_df else 0
            
            # Calculate each player's share
            for _, player in team_df.iterrows():
                share_metrics = {
                    'player_id': player['player_id'],
                    'player_name': player.get('player_name', ''),
                    'position': player.get('position', ''),
                    'team': team
                }
                
                if position_filter in ['RB', 'FB'] or player.get('position') in ['RB', 'FB']:
                    if team_rz_carries > 0:
                        share_metrics['red_zone_carry_share'] = round(
                            (player.get('red_zone_carries', 0) / team_rz_carries) * 100, 2
                        )
                    if team_rz_touches > 0:
                        share_metrics['red_zone_touch_share'] = round(
                            (player.get('red_zone_touches', 0) / team_rz_touches) * 100, 2
                        )
                
                if position_filter in ['WR', 'TE'] or player.get('position') in ['WR', 'TE']:
                    if team_rz_targets > 0:
                        share_metrics['red_zone_target_share'] = round(
                            (player.get('red_zone_targets', 0) / team_rz_targets) * 100, 2
                        )
                
                results.append(share_metrics)
        
        return pd.DataFrame(results)
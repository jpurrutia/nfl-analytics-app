"""
Target Share Calculator
Calculates target share, air yards share, and opportunity metrics
"""

import logging
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class TargetShareCalculator:
    """
    Calculates target share and opportunity metrics for pass catchers.
    Target share is crucial for evaluating WR/TE involvement in the offense.
    """
    
    def __init__(self):
        """Initialize the target share calculator."""
        logger.info("Target share calculator initialized")
    
    def calculate_target_share(self, player_targets: int, team_targets: int) -> float:
        """
        Calculate individual target share percentage.
        
        Args:
            player_targets: Player's targets
            team_targets: Total team targets
            
        Returns:
            Target share percentage
        """
        if team_targets <= 0:
            return 0.0
        
        return round((player_targets / team_targets) * 100, 2)
    
    def calculate_air_yards_share(self, player_air_yards: float, 
                                  team_air_yards: float) -> float:
        """
        Calculate air yards share (share of team's intended passing yards).
        
        Args:
            player_air_yards: Player's air yards
            team_air_yards: Total team air yards
            
        Returns:
            Air yards share percentage
        """
        if team_air_yards <= 0:
            return 0.0
        
        return round((player_air_yards / team_air_yards) * 100, 2)
    
    def calculate_wopr(self, target_share: float, air_yards_share: float) -> float:
        """
        Calculate WOPR (Weighted Opportunity Rating).
        Combines target share and air yards share.
        
        Args:
            target_share: Player's target share
            air_yards_share: Player's air yards share
            
        Returns:
            WOPR score (0-1 scale)
        """
        # WOPR = 1.5 * target_share + 0.7 * air_yards_share
        wopr = (1.5 * target_share / 100) + (0.7 * air_yards_share / 100)
        return round(min(wopr, 1.0), 3)  # Cap at 1.0
    
    def calculate_racr(self, receiving_yards: float, air_yards: float) -> float:
        """
        Calculate RACR (Receiver Air Conversion Ratio).
        Measures efficiency at converting air yards to actual yards.
        
        Args:
            receiving_yards: Actual receiving yards
            air_yards: Air yards (intended yards)
            
        Returns:
            RACR value (1.0 = average)
        """
        if air_yards <= 0:
            return 0.0
        
        return round(receiving_yards / air_yards, 3)
    
    def calculate_yac_share(self, player_yac: float, team_yac: float) -> float:
        """
        Calculate YAC (Yards After Catch) share.
        
        Args:
            player_yac: Player's YAC
            team_yac: Total team YAC
            
        Returns:
            YAC share percentage
        """
        if team_yac <= 0:
            return 0.0
        
        return round((player_yac / team_yac) * 100, 2)
    
    def calculate_opportunity_metrics(self, df: pd.DataFrame,
                                     player_column: str = 'player_id') -> pd.DataFrame:
        """
        Calculate opportunity metrics for multiple players.
        
        Args:
            df: DataFrame with receiving data
            player_column: Column identifying players
            
        Returns:
            DataFrame with opportunity metrics
        """
        results = []
        
        # Group by week/game for team totals
        if 'week' in df.columns:
            group_cols = ['season', 'week', 'team']
        else:
            group_cols = ['season', 'game_id', 'team']
        
        # Calculate team totals
        team_totals = df.groupby(group_cols).agg({
            'targets': 'sum',
            'air_yards': 'sum',
            'yards_after_catch': 'sum',
            'receiving_yards': 'sum'
        }).rename(columns={
            'targets': 'team_targets',
            'air_yards': 'team_air_yards',
            'yards_after_catch': 'team_yac',
            'receiving_yards': 'team_receiving_yards'
        })
        
        # Merge team totals back to player data
        df = df.merge(team_totals, left_on=group_cols, right_index=True, how='left')
        
        # Calculate metrics for each player
        for player_id, player_df in df.groupby(player_column):
            # Aggregate player stats
            player_stats = {
                'player_id': player_id,
                'player_name': player_df['player_name'].iloc[0] if 'player_name' in player_df else player_id,
                'position': player_df['position'].iloc[0] if 'position' in player_df else None,
                'team': player_df['team'].iloc[0] if 'team' in player_df else None,
                'games': len(player_df),
                'total_targets': player_df['targets'].sum(),
                'total_air_yards': player_df['air_yards'].sum() if 'air_yards' in player_df else 0,
                'total_receiving_yards': player_df['receiving_yards'].sum(),
                'total_yac': player_df['yards_after_catch'].sum() if 'yards_after_catch' in player_df else 0
            }
            
            # Calculate average team totals
            avg_team_targets = player_df['team_targets'].mean()
            avg_team_air_yards = player_df['team_air_yards'].mean() if 'team_air_yards' in player_df else 0
            avg_team_yac = player_df['team_yac'].mean() if 'team_yac' in player_df else 0
            
            # Per-game averages
            player_stats['targets_per_game'] = round(player_stats['total_targets'] / player_stats['games'], 2)
            player_stats['air_yards_per_game'] = round(player_stats['total_air_yards'] / player_stats['games'], 2)
            
            # Calculate shares
            player_stats['target_share'] = self.calculate_target_share(
                player_stats['targets_per_game'], avg_team_targets
            )
            
            if 'air_yards' in df.columns:
                player_stats['air_yards_share'] = self.calculate_air_yards_share(
                    player_stats['air_yards_per_game'], avg_team_air_yards
                )
                
                player_stats['wopr'] = self.calculate_wopr(
                    player_stats['target_share'], player_stats['air_yards_share']
                )
                
                player_stats['racr'] = self.calculate_racr(
                    player_stats['total_receiving_yards'], player_stats['total_air_yards']
                )
            
            if 'yards_after_catch' in df.columns:
                player_stats['yac_share'] = self.calculate_yac_share(
                    player_stats['total_yac'] / player_stats['games'], avg_team_yac
                )
            
            # Opportunity score (composite metric)
            player_stats['opportunity_score'] = self.calculate_opportunity_score(player_stats)
            
            results.append(player_stats)
        
        return pd.DataFrame(results)
    
    def calculate_opportunity_score(self, metrics: Dict) -> float:
        """
        Calculate composite opportunity score.
        
        Args:
            metrics: Dictionary with player metrics
            
        Returns:
            Opportunity score (0-100)
        """
        score = 0.0
        weights_sum = 0.0
        
        # Weight different components
        weights = {
            'target_share': 0.35,
            'air_yards_share': 0.25,
            'wopr': 0.20,
            'racr': 0.10,
            'yac_share': 0.10
        }
        
        for metric, weight in weights.items():
            if metric in metrics and metrics[metric] is not None:
                if metric == 'racr':
                    # RACR centered around 1.0
                    value = min(metrics[metric] * 50, 100)
                elif metric == 'wopr':
                    # WOPR on 0-1 scale
                    value = metrics[metric] * 100
                else:
                    # Shares already in percentage
                    value = min(metrics[metric], 100)
                
                score += value * weight
                weights_sum += weight
        
        # Normalize by actual weights used
        if weights_sum > 0:
            score = score / weights_sum
        
        return round(score, 2)
    
    def calculate_red_zone_target_share(self, df: pd.DataFrame,
                                       player_column: str = 'player_id') -> pd.DataFrame:
        """
        Calculate red zone specific target shares.
        
        Args:
            df: DataFrame with play data including red zone info
            player_column: Column identifying players
            
        Returns:
            DataFrame with red zone target metrics
        """
        # Filter for red zone plays
        if 'yardline_100' in df.columns:
            rz_df = df[df['yardline_100'] <= 20].copy()
        else:
            logger.warning("No yardline data for red zone calculation")
            return pd.DataFrame()
        
        if rz_df.empty:
            return pd.DataFrame()
        
        results = []
        
        # Calculate team red zone totals
        rz_team_totals = rz_df.groupby(['season', 'team']).agg({
            'targets': 'sum',
            'receiving_touchdowns': 'sum'
        }).rename(columns={
            'targets': 'team_rz_targets',
            'receiving_touchdowns': 'team_rz_tds'
        })
        
        # Calculate player red zone metrics
        for (player_id, team), player_df in rz_df.groupby([player_column, 'team']):
            season = player_df['season'].iloc[0]
            team_stats = rz_team_totals.loc[(season, team)]
            
            rz_metrics = {
                'player_id': player_id,
                'player_name': player_df['player_name'].iloc[0] if 'player_name' in player_df else player_id,
                'team': team,
                'season': season,
                'red_zone_targets': player_df['targets'].sum(),
                'red_zone_receptions': player_df['receptions'].sum(),
                'red_zone_touchdowns': player_df['receiving_touchdowns'].sum(),
                'red_zone_target_share': self.calculate_target_share(
                    player_df['targets'].sum(), team_stats['team_rz_targets']
                ),
                'red_zone_td_rate': round(
                    (player_df['receiving_touchdowns'].sum() / player_df['targets'].sum() * 100)
                    if player_df['targets'].sum() > 0 else 0, 2
                )
            }
            
            results.append(rz_metrics)
        
        return pd.DataFrame(results)
    
    def calculate_usage_trend(self, df: pd.DataFrame, 
                            player_id: str,
                            window: int = 4) -> Dict:
        """
        Calculate usage trend over recent games.
        
        Args:
            df: DataFrame with weekly data
            player_id: Player to analyze
            window: Number of recent games to consider
            
        Returns:
            Dictionary with trend metrics
        """
        # Filter for player and sort by week
        player_df = df[df['player_id'] == player_id].sort_values('week')
        
        if len(player_df) < window:
            return {'trend': 'insufficient_data'}
        
        # Get recent and earlier windows
        recent = player_df.tail(window)
        earlier = player_df.iloc[-window*2:-window] if len(player_df) >= window*2 else player_df.head(window)
        
        # Calculate averages
        recent_targets = recent['targets'].mean()
        earlier_targets = earlier['targets'].mean()
        
        # Determine trend
        if earlier_targets > 0:
            change_pct = ((recent_targets - earlier_targets) / earlier_targets) * 100
            
            if change_pct > 20:
                trend = 'increasing'
            elif change_pct < -20:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        return {
            'usage_trend': trend,
            'recent_targets_avg': round(recent_targets, 2),
            'earlier_targets_avg': round(earlier_targets, 2),
            'change_percentage': round(change_pct if earlier_targets > 0 else 0, 2)
        }
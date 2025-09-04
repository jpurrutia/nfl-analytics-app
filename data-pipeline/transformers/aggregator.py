"""
Data Aggregator
Aggregates player statistics at different levels (game, week, season)
"""

import logging
from typing import Dict, List, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class StatsAggregator:
    """
    Aggregates player statistics at various levels for analysis.
    """
    
    # Columns to sum when aggregating
    SUM_COLUMNS = [
        'passing_attempts', 'completions', 'passing_yards', 'passing_tds', 'interceptions',
        'sacks', 'sack_yards', 'passing_2pt',
        'carries', 'rushing_attempts', 'rushing_yards', 'rushing_tds', 'rushing_2pt',
        'targets', 'receptions', 'receiving_yards', 'receiving_tds', 'receiving_2pt',
        'fumbles', 'fumbles_lost',
        'fantasy_points', 'fantasy_points_ppr', 'fantasy_points_half_ppr',
        'red_zone_targets', 'red_zone_carries', 'red_zone_touches', 'red_zone_tds',
        'air_yards', 'yards_after_catch',
        'touches', 'opportunities'
    ]
    
    # Columns to average when aggregating
    MEAN_COLUMNS = [
        'snap_percentage', 'target_share', 'air_yards_share',
        'yards_per_target', 'yards_per_carry', 'catch_rate'
    ]
    
    # Columns to take maximum when aggregating
    MAX_COLUMNS = [
        'rushing_long', 'receiving_long', 'passing_long'
    ]
    
    def __init__(self):
        """Initialize the aggregator."""
        logger.info("Stats aggregator initialized")
    
    def aggregate_to_game_level(self, plays_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate play-by-play data to game level statistics.
        
        Args:
            plays_df: DataFrame with play-by-play data
            
        Returns:
            DataFrame with game-level statistics
        """
        logger.info("Aggregating play-by-play data to game level")
        
        # Group by game and player
        groupby_cols = ['game_id', 'player_id', 'player_name', 'position', 'team', 
                       'season', 'week', 'game_date']
        
        # Filter to columns that exist
        groupby_cols = [col for col in groupby_cols if col in plays_df.columns]
        
        if not groupby_cols:
            logger.error("Required grouping columns not found")
            return pd.DataFrame()
        
        # Aggregate statistics
        agg_dict = {}
        
        # Count plays
        if 'play_id' in plays_df.columns:
            agg_dict['play_id'] = 'count'
        
        # Sum statistics
        for col in self.SUM_COLUMNS:
            if col in plays_df.columns:
                agg_dict[col] = 'sum'
        
        # Max statistics
        for col in self.MAX_COLUMNS:
            if col in plays_df.columns:
                agg_dict[col] = 'max'
        
        # Perform aggregation
        game_stats = plays_df.groupby(groupby_cols, as_index=False).agg(agg_dict)
        
        # Rename play_id count to plays
        if 'play_id' in game_stats.columns:
            game_stats = game_stats.rename(columns={'play_id': 'plays'})
        
        # Calculate derived metrics
        game_stats = self._calculate_efficiency_metrics(game_stats)
        
        # Generate composite key
        if 'player_id' in game_stats.columns and 'game_id' in game_stats.columns:
            game_stats['player_game_key'] = (
                game_stats['player_id'].astype(str) + '_' + 
                game_stats['game_id'].astype(str)
            )
        
        logger.info(f"Aggregated to {len(game_stats)} game-level records")
        
        return game_stats
    
    def aggregate_to_week_level(self, game_stats_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate game statistics to weekly level.
        
        Args:
            game_stats_df: DataFrame with game-level statistics
            
        Returns:
            DataFrame with weekly statistics
        """
        logger.info("Aggregating game stats to weekly level")
        
        # Group by player and week
        groupby_cols = ['player_id', 'player_name', 'position', 'team', 
                       'season', 'week']
        
        # Filter to columns that exist
        groupby_cols = [col for col in groupby_cols if col in game_stats_df.columns]
        
        # Create aggregation dictionary
        agg_dict = {'games_played': ('game_id', 'nunique') if 'game_id' in game_stats_df.columns else ('player_id', 'count')}
        
        # Sum columns
        for col in self.SUM_COLUMNS:
            if col in game_stats_df.columns:
                agg_dict[col] = (col, 'sum')
        
        # Average columns
        for col in self.MEAN_COLUMNS:
            if col in game_stats_df.columns:
                agg_dict[col] = (col, 'mean')
        
        # Max columns
        for col in self.MAX_COLUMNS:
            if col in game_stats_df.columns:
                agg_dict[col] = (col, 'max')
        
        # Perform aggregation
        week_stats = game_stats_df.groupby(groupby_cols, as_index=False).agg(**agg_dict)
        
        # Calculate derived metrics
        week_stats = self._calculate_efficiency_metrics(week_stats)
        
        # Generate composite key
        if all(col in week_stats.columns for col in ['player_id', 'season', 'week']):
            week_stats['player_week_key'] = (
                week_stats['player_id'].astype(str) + '_' +
                week_stats['season'].astype(str) + '_' +
                week_stats['week'].astype(str)
            )
        
        logger.info(f"Aggregated to {len(week_stats)} weekly records")
        
        return week_stats
    
    def aggregate_to_season_level(self, week_stats_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate weekly statistics to season level.
        
        Args:
            week_stats_df: DataFrame with weekly statistics
            
        Returns:
            DataFrame with season totals
        """
        logger.info("Aggregating weekly stats to season level")
        
        # Group by player and season
        groupby_cols = ['player_id', 'player_name', 'position', 'team', 'season']
        
        # Filter to columns that exist
        groupby_cols = [col for col in groupby_cols if col in week_stats_df.columns]
        
        # Create aggregation dictionary
        agg_dict = {
            'games_played': ('games_played', 'sum') if 'games_played' in week_stats_df.columns else ('week', 'nunique')
        }
        
        # Sum columns (rename with total_ prefix)
        for col in self.SUM_COLUMNS:
            if col in week_stats_df.columns:
                new_col_name = f'total_{col}'
                agg_dict[new_col_name] = (col, 'sum')
        
        # Average columns
        for col in self.MEAN_COLUMNS:
            if col in week_stats_df.columns:
                new_col_name = f'avg_{col}'
                agg_dict[new_col_name] = (col, 'mean')
        
        # Perform aggregation
        season_stats = week_stats_df.groupby(groupby_cols, as_index=False).agg(**agg_dict)
        
        # Calculate per-game averages
        if 'games_played' in season_stats.columns and season_stats['games_played'].notna().any():
            for col in self.SUM_COLUMNS:
                total_col = f'total_{col}'
                if total_col in season_stats.columns:
                    avg_col = f'avg_{col}'
                    season_stats[avg_col] = (
                        season_stats[total_col] / season_stats['games_played']
                    ).round(2)
        
        # Generate composite key
        if 'player_id' in season_stats.columns and 'season' in season_stats.columns:
            season_stats['season_key'] = (
                season_stats['player_id'].astype(str) + '_' +
                season_stats['season'].astype(str)
            )
        
        logger.info(f"Aggregated to {len(season_stats)} season records")
        
        return season_stats
    
    def _calculate_efficiency_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate efficiency metrics from raw stats.
        
        Args:
            df: DataFrame with statistics
            
        Returns:
            DataFrame with efficiency metrics added
        """
        result_df = df.copy()
        
        # Completion percentage
        if 'completions' in df.columns and 'passing_attempts' in df.columns:
            result_df['completion_pct'] = np.where(
                df['passing_attempts'] > 0,
                (df['completions'] / df['passing_attempts'] * 100),
                0
            ).round(2)
        
        # Catch rate
        if 'receptions' in df.columns and 'targets' in df.columns:
            result_df['catch_rate'] = np.where(
                df['targets'] > 0,
                (df['receptions'] / df['targets'] * 100),
                0
            ).round(2)
        
        # Yards per attempt (passing)
        if 'passing_yards' in df.columns and 'passing_attempts' in df.columns:
            result_df['yards_per_attempt'] = np.where(
                df['passing_attempts'] > 0,
                (df['passing_yards'] / df['passing_attempts']),
                0
            ).round(2)
        
        # Yards per carry
        if 'rushing_yards' in df.columns and 'rushing_attempts' in df.columns:
            result_df['yards_per_carry'] = np.where(
                df['rushing_attempts'] > 0,
                (df['rushing_yards'] / df['rushing_attempts']),
                0
            ).round(2)
        elif 'rushing_yards' in df.columns and 'carries' in df.columns:
            result_df['yards_per_carry'] = np.where(
                df['carries'] > 0,
                (df['rushing_yards'] / df['carries']),
                0
            ).round(2)
        
        # Yards per reception
        if 'receiving_yards' in df.columns and 'receptions' in df.columns:
            result_df['yards_per_reception'] = np.where(
                df['receptions'] > 0,
                (df['receiving_yards'] / df['receptions']),
                0
            ).round(2)
        
        # Yards per target
        if 'receiving_yards' in df.columns and 'targets' in df.columns:
            result_df['yards_per_target'] = np.where(
                df['targets'] > 0,
                (df['receiving_yards'] / df['targets']),
                0
            ).round(2)
        
        # TD rate (passing)
        if 'passing_tds' in df.columns and 'passing_attempts' in df.columns:
            result_df['passing_td_rate'] = np.where(
                df['passing_attempts'] > 0,
                (df['passing_tds'] / df['passing_attempts'] * 100),
                0
            ).round(2)
        
        # Red zone efficiency
        if 'red_zone_tds' in df.columns and 'red_zone_touches' in df.columns:
            result_df['red_zone_td_rate'] = np.where(
                df['red_zone_touches'] > 0,
                (df['red_zone_tds'] / df['red_zone_touches'] * 100),
                0
            ).round(2)
        
        return result_df
    
    def calculate_team_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate team-level aggregates for context.
        
        Args:
            df: DataFrame with player statistics
            
        Returns:
            DataFrame with team aggregates
        """
        if 'team' not in df.columns:
            logger.warning("Team column not found")
            return pd.DataFrame()
        
        # Group by team and calculate totals
        groupby_cols = ['team', 'season', 'week'] if 'week' in df.columns else ['team', 'season']
        groupby_cols = [col for col in groupby_cols if col in df.columns]
        
        team_stats = df.groupby(groupby_cols, as_index=False).agg({
            'targets': 'sum' if 'targets' in df.columns else None,
            'carries': 'sum' if 'carries' in df.columns else None,
            'rushing_attempts': 'sum' if 'rushing_attempts' in df.columns else None,
            'passing_attempts': 'sum' if 'passing_attempts' in df.columns else None,
            'red_zone_touches': 'sum' if 'red_zone_touches' in df.columns else None
        })
        
        # Remove None columns
        team_stats = team_stats.dropna(axis=1, how='all')
        
        # Rename columns with team_ prefix
        rename_dict = {col: f'team_{col}' for col in team_stats.columns if col not in groupby_cols}
        team_stats = team_stats.rename(columns=rename_dict)
        
        logger.info(f"Calculated team aggregates for {len(team_stats)} team-weeks")
        
        return team_stats
    
    def merge_team_context(self, player_df: pd.DataFrame, 
                          team_df: pd.DataFrame) -> pd.DataFrame:
        """
        Merge team context into player statistics.
        
        Args:
            player_df: DataFrame with player statistics
            team_df: DataFrame with team aggregates
            
        Returns:
            DataFrame with team context added
        """
        # Determine merge keys
        merge_keys = ['team', 'season']
        if 'week' in player_df.columns and 'week' in team_df.columns:
            merge_keys.append('week')
        
        # Merge team data
        result_df = player_df.merge(
            team_df,
            on=merge_keys,
            how='left',
            suffixes=('', '_team')
        )
        
        # Calculate share metrics
        if 'targets' in result_df.columns and 'team_targets' in result_df.columns:
            result_df['target_share'] = np.where(
                result_df['team_targets'] > 0,
                (result_df['targets'] / result_df['team_targets'] * 100),
                0
            ).round(2)
        
        if 'red_zone_touches' in result_df.columns and 'team_red_zone_touches' in result_df.columns:
            result_df['red_zone_share'] = np.where(
                result_df['team_red_zone_touches'] > 0,
                (result_df['red_zone_touches'] / result_df['team_red_zone_touches'] * 100),
                0
            ).round(2)
        
        logger.info("Merged team context into player statistics")
        
        return result_df
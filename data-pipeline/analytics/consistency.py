"""
Consistency Score Calculator
Calculates player consistency metrics based on fantasy point variance
"""

import logging
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class ConsistencyCalculator:
    """
    Calculates consistency scores for fantasy players.
    Consistency measures how reliably a player produces fantasy points.
    """
    
    def __init__(self, min_games: int = 4):
        """
        Initialize the consistency calculator.
        
        Args:
            min_games: Minimum games required for calculation
        """
        self.min_games = min_games
        logger.info(f"Consistency calculator initialized (min_games={min_games})")
    
    def calculate_consistency_score(self, 
                                   points_series: pd.Series,
                                   method: str = 'cv') -> float:
        """
        Calculate consistency score for a series of fantasy points.
        
        Args:
            points_series: Series of fantasy points
            method: Calculation method ('cv', 'modified_cv', 'percentile')
            
        Returns:
            Consistency score (0-100, higher is more consistent)
        """
        if len(points_series) < self.min_games:
            return np.nan
        
        points = points_series.dropna().values
        
        if len(points) < self.min_games:
            return np.nan
        
        if method == 'cv':
            # Coefficient of Variation method (inverse)
            mean_points = np.mean(points)
            if mean_points <= 0:
                return 0.0
            
            std_points = np.std(points, ddof=1)
            cv = std_points / mean_points
            
            # Convert to 0-100 scale (lower CV = higher consistency)
            # Cap CV at 2.0 for scaling
            cv_capped = min(cv, 2.0)
            consistency = (1 - cv_capped / 2.0) * 100
            
        elif method == 'modified_cv':
            # Modified CV that accounts for floor performance
            mean_points = np.mean(points)
            if mean_points <= 0:
                return 0.0
            
            # Use 25th percentile as floor
            floor = np.percentile(points, 25)
            
            # Calculate variance from floor
            variance_from_floor = np.mean((points - floor) ** 2)
            modified_cv = np.sqrt(variance_from_floor) / mean_points
            
            # Convert to 0-100 scale
            modified_cv_capped = min(modified_cv, 2.0)
            consistency = (1 - modified_cv_capped / 2.0) * 100
            
        elif method == 'percentile':
            # Percentile range method
            p75 = np.percentile(points, 75)
            p25 = np.percentile(points, 25)
            median = np.median(points)
            
            if median <= 0:
                return 0.0
            
            # Interquartile range relative to median
            iqr_ratio = (p75 - p25) / median
            
            # Convert to consistency score (lower ratio = higher consistency)
            iqr_ratio_capped = min(iqr_ratio, 3.0)
            consistency = (1 - iqr_ratio_capped / 3.0) * 100
            
        else:
            raise ValueError(f"Unknown method: {method}")
        
        return round(consistency, 2)
    
    def calculate_floor_ceiling(self, points_series: pd.Series) -> Dict[str, float]:
        """
        Calculate floor and ceiling for a player.
        
        Args:
            points_series: Series of fantasy points
            
        Returns:
            Dictionary with floor and ceiling values
        """
        if len(points_series) < self.min_games:
            return {'floor': np.nan, 'ceiling': np.nan}
        
        points = points_series.dropna().values
        
        return {
            'floor': round(np.percentile(points, 25), 2),
            'ceiling': round(np.percentile(points, 75), 2),
            'median': round(np.median(points), 2)
        }
    
    def calculate_week_to_week_variance(self, points_series: pd.Series) -> float:
        """
        Calculate week-to-week variance (how much points change between games).
        
        Args:
            points_series: Series of fantasy points
            
        Returns:
            Week-to-week variance score
        """
        if len(points_series) < 2:
            return np.nan
        
        points = points_series.dropna().values
        
        if len(points) < 2:
            return np.nan
        
        # Calculate differences between consecutive weeks
        week_diffs = np.abs(np.diff(points))
        
        # Average week-to-week change
        avg_change = np.mean(week_diffs)
        
        return round(avg_change, 2)
    
    def calculate_trend(self, points_series: pd.Series) -> Dict[str, any]:
        """
        Calculate trend in fantasy points over time.
        
        Args:
            points_series: Series of fantasy points (ordered by time)
            
        Returns:
            Dictionary with trend information
        """
        if len(points_series) < 4:
            return {'trend': 'insufficient_data', 'slope': np.nan}
        
        points = points_series.dropna().values
        x = np.arange(len(points))
        
        # Linear regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, points)
        
        # Determine trend direction
        if p_value < 0.05:  # Statistically significant
            if slope > 0.5:
                trend = 'improving'
            elif slope < -0.5:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        # Calculate recent form (last 3 games vs season average)
        if len(points) >= 3:
            recent_avg = np.mean(points[-3:])
            season_avg = np.mean(points)
            form_ratio = recent_avg / season_avg if season_avg > 0 else 1.0
            
            if form_ratio > 1.2:
                recent_form = 'hot'
            elif form_ratio < 0.8:
                recent_form = 'cold'
            else:
                recent_form = 'normal'
        else:
            recent_form = 'unknown'
        
        return {
            'trend': trend,
            'slope': round(slope, 3),
            'r_squared': round(r_value ** 2, 3),
            'p_value': round(p_value, 4),
            'recent_form': recent_form
        }
    
    def calculate_all_metrics(self, player_df: pd.DataFrame,
                            points_column: str = 'fantasy_points_ppr') -> Dict[str, any]:
        """
        Calculate all consistency metrics for a player.
        
        Args:
            player_df: DataFrame with player's weekly data
            points_column: Column containing fantasy points
            
        Returns:
            Dictionary with all consistency metrics
        """
        if points_column not in player_df.columns:
            logger.warning(f"Column {points_column} not found")
            return {}
        
        points = player_df[points_column]
        
        metrics = {
            'games_played': len(points.dropna()),
            'consistency_score': self.calculate_consistency_score(points),
            'consistency_score_modified': self.calculate_consistency_score(points, method='modified_cv'),
            'consistency_score_percentile': self.calculate_consistency_score(points, method='percentile'),
            'week_to_week_variance': self.calculate_week_to_week_variance(points),
            **self.calculate_floor_ceiling(points),
            **self.calculate_trend(points)
        }
        
        # Add average points
        metrics['average_points'] = round(points.mean(), 2) if not points.empty else np.nan
        metrics['total_points'] = round(points.sum(), 2) if not points.empty else np.nan
        
        return metrics
    
    def calculate_for_multiple_players(self, df: pd.DataFrame,
                                      player_column: str = 'player_id',
                                      points_column: str = 'fantasy_points_ppr',
                                      season: Optional[int] = None) -> pd.DataFrame:
        """
        Calculate consistency metrics for multiple players.
        
        Args:
            df: DataFrame with all players' data
            player_column: Column identifying players
            points_column: Column containing fantasy points
            season: Optional season filter
            
        Returns:
            DataFrame with consistency metrics for each player
        """
        results = []
        
        # Filter by season if specified
        if season and 'season' in df.columns:
            df = df[df['season'] == season]
        
        # Group by player
        for player_id, player_df in df.groupby(player_column):
            # Sort by week if available
            if 'week' in player_df.columns:
                player_df = player_df.sort_values('week')
            
            metrics = self.calculate_all_metrics(player_df, points_column)
            
            # Add player identification
            metrics[player_column] = player_id
            
            # Add additional context if available
            if 'player_name' in player_df.columns:
                metrics['player_name'] = player_df['player_name'].iloc[0]
            if 'position' in player_df.columns:
                metrics['position'] = player_df['position'].iloc[0]
            if 'team' in player_df.columns:
                metrics['team'] = player_df['team'].mode()[0] if not player_df['team'].empty else None
            if season:
                metrics['season'] = season
            
            results.append(metrics)
        
        return pd.DataFrame(results)
    
    def rank_by_consistency(self, metrics_df: pd.DataFrame,
                           weight_consistency: float = 0.5,
                           weight_average: float = 0.3,
                           weight_floor: float = 0.2) -> pd.DataFrame:
        """
        Rank players by weighted consistency metrics.
        
        Args:
            metrics_df: DataFrame with consistency metrics
            weight_consistency: Weight for consistency score
            weight_average: Weight for average points
            weight_floor: Weight for floor score
            
        Returns:
            DataFrame with rankings added
        """
        df = metrics_df.copy()
        
        # Normalize metrics to 0-100 scale
        if 'consistency_score' in df.columns:
            # Already 0-100
            df['consistency_norm'] = df['consistency_score']
        
        if 'average_points' in df.columns:
            # Normalize average points (assume max realistic average is 30)
            df['average_norm'] = (df['average_points'] / 30) * 100
            df['average_norm'] = df['average_norm'].clip(upper=100)
        
        if 'floor' in df.columns:
            # Normalize floor (assume max realistic floor is 20)
            df['floor_norm'] = (df['floor'] / 20) * 100
            df['floor_norm'] = df['floor_norm'].clip(upper=100)
        
        # Calculate weighted score
        df['consistency_rating'] = (
            weight_consistency * df.get('consistency_norm', 0) +
            weight_average * df.get('average_norm', 0) +
            weight_floor * df.get('floor_norm', 0)
        )
        
        # Rank within position groups if position column exists
        if 'position' in df.columns:
            df['consistency_rank_position'] = df.groupby('position')['consistency_rating'].rank(
                ascending=False, method='min'
            ).astype(int)
        
        # Overall rank
        df['consistency_rank_overall'] = df['consistency_rating'].rank(
            ascending=False, method='min'
        ).astype(int)
        
        # Clean up temporary columns
        df = df.drop(columns=['consistency_norm', 'average_norm', 'floor_norm'], errors='ignore')
        
        return df.sort_values('consistency_rank_overall')
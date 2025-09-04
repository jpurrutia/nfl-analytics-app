"""
Boom/Bust Rate Calculator
Calculates the percentage of games where players exceed or fall below thresholds
"""

import logging
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class BoomBustCalculator:
    """
    Calculates boom and bust rates for fantasy players.
    Boom = exceptional performance, Bust = poor performance.
    """
    
    # Default thresholds by position and scoring format
    DEFAULT_THRESHOLDS = {
        'standard': {
            'QB': {'boom': 22, 'bust': 12},
            'RB': {'boom': 18, 'bust': 8},
            'WR': {'boom': 18, 'bust': 8},
            'TE': {'boom': 14, 'bust': 6},
            'K': {'boom': 12, 'bust': 4},
            'DST': {'boom': 15, 'bust': 5}
        },
        'ppr': {
            'QB': {'boom': 22, 'bust': 12},
            'RB': {'boom': 20, 'bust': 10},
            'WR': {'boom': 20, 'bust': 10},
            'TE': {'boom': 16, 'bust': 8},
            'K': {'boom': 12, 'bust': 4},
            'DST': {'boom': 15, 'bust': 5}
        },
        'half_ppr': {
            'QB': {'boom': 22, 'bust': 12},
            'RB': {'boom': 19, 'bust': 9},
            'WR': {'boom': 19, 'bust': 9},
            'TE': {'boom': 15, 'bust': 7},
            'K': {'boom': 12, 'bust': 4},
            'DST': {'boom': 15, 'bust': 5}
        }
    }
    
    def __init__(self, scoring_format: str = 'ppr', custom_thresholds: Optional[Dict] = None):
        """
        Initialize the boom/bust calculator.
        
        Args:
            scoring_format: Fantasy scoring format
            custom_thresholds: Optional custom thresholds by position
        """
        self.scoring_format = scoring_format
        
        if custom_thresholds:
            self.thresholds = custom_thresholds
        else:
            self.thresholds = self.DEFAULT_THRESHOLDS.get(scoring_format, self.DEFAULT_THRESHOLDS['ppr'])
        
        logger.info(f"Boom/bust calculator initialized for {scoring_format} scoring")
    
    def get_thresholds(self, position: str) -> Tuple[float, float]:
        """
        Get boom and bust thresholds for a position.
        
        Args:
            position: Player position
            
        Returns:
            Tuple of (boom_threshold, bust_threshold)
        """
        pos_upper = position.upper() if position else 'WR'
        
        if pos_upper in self.thresholds:
            thresh = self.thresholds[pos_upper]
            return thresh['boom'], thresh['bust']
        else:
            # Default to WR thresholds for unknown positions
            thresh = self.thresholds.get('WR', {'boom': 20, 'bust': 10})
            return thresh['boom'], thresh['bust']
    
    def calculate_boom_bust_rates(self, 
                                 points_series: pd.Series,
                                 position: str = None,
                                 boom_threshold: Optional[float] = None,
                                 bust_threshold: Optional[float] = None) -> Dict[str, float]:
        """
        Calculate boom and bust rates for a series of fantasy points.
        
        Args:
            points_series: Series of fantasy points
            position: Player position (for automatic thresholds)
            boom_threshold: Custom boom threshold
            bust_threshold: Custom bust threshold
            
        Returns:
            Dictionary with boom and bust rates
        """
        if points_series.empty:
            return {'boom_rate': 0.0, 'bust_rate': 0.0, 'games_played': 0}
        
        points = points_series.dropna()
        
        if len(points) == 0:
            return {'boom_rate': 0.0, 'bust_rate': 0.0, 'games_played': 0}
        
        # Determine thresholds
        if boom_threshold is None or bust_threshold is None:
            auto_boom, auto_bust = self.get_thresholds(position)
            boom_threshold = boom_threshold or auto_boom
            bust_threshold = bust_threshold or auto_bust
        
        # Calculate rates
        boom_games = (points >= boom_threshold).sum()
        bust_games = (points <= bust_threshold).sum()
        total_games = len(points)
        
        boom_rate = (boom_games / total_games * 100) if total_games > 0 else 0
        bust_rate = (bust_games / total_games * 100) if total_games > 0 else 0
        
        return {
            'boom_rate': round(boom_rate, 2),
            'bust_rate': round(bust_rate, 2),
            'boom_games': int(boom_games),
            'bust_games': int(bust_games),
            'games_played': int(total_games),
            'boom_threshold': boom_threshold,
            'bust_threshold': bust_threshold
        }
    
    def calculate_percentile_boom_bust(self, 
                                      points_series: pd.Series,
                                      boom_percentile: int = 75,
                                      bust_percentile: int = 25) -> Dict[str, float]:
        """
        Calculate boom/bust rates based on percentiles of the player's own performance.
        
        Args:
            points_series: Series of fantasy points
            boom_percentile: Percentile for boom threshold
            bust_percentile: Percentile for bust threshold
            
        Returns:
            Dictionary with percentile-based boom and bust rates
        """
        if points_series.empty or len(points_series.dropna()) < 4:
            return {'percentile_boom_rate': 0.0, 'percentile_bust_rate': 0.0}
        
        points = points_series.dropna()
        
        # Calculate thresholds based on player's own distribution
        boom_thresh = np.percentile(points, boom_percentile)
        bust_thresh = np.percentile(points, bust_percentile)
        
        # Calculate how often player exceeds their own thresholds
        boom_rate = ((points >= boom_thresh).sum() / len(points) * 100)
        bust_rate = ((points <= bust_thresh).sum() / len(points) * 100)
        
        return {
            'percentile_boom_rate': round(boom_rate, 2),
            'percentile_bust_rate': round(bust_rate, 2),
            'percentile_boom_threshold': round(boom_thresh, 2),
            'percentile_bust_threshold': round(bust_thresh, 2)
        }
    
    def calculate_elite_dud_rates(self, 
                                 points_series: pd.Series,
                                 position: str = None) -> Dict[str, float]:
        """
        Calculate elite and dud game rates (more extreme than boom/bust).
        
        Args:
            points_series: Series of fantasy points
            position: Player position
            
        Returns:
            Dictionary with elite and dud rates
        """
        if points_series.empty:
            return {'elite_rate': 0.0, 'dud_rate': 0.0}
        
        points = points_series.dropna()
        
        if len(points) == 0:
            return {'elite_rate': 0.0, 'dud_rate': 0.0}
        
        # Elite/dud thresholds (more extreme)
        boom_thresh, bust_thresh = self.get_thresholds(position)
        elite_thresh = boom_thresh * 1.5  # 50% higher than boom
        dud_thresh = bust_thresh * 0.5    # 50% lower than bust
        
        elite_games = (points >= elite_thresh).sum()
        dud_games = (points <= dud_thresh).sum()
        total_games = len(points)
        
        elite_rate = (elite_games / total_games * 100) if total_games > 0 else 0
        dud_rate = (dud_games / total_games * 100) if total_games > 0 else 0
        
        return {
            'elite_rate': round(elite_rate, 2),
            'dud_rate': round(dud_rate, 2),
            'elite_games': int(elite_games),
            'dud_games': int(dud_games),
            'elite_threshold': round(elite_thresh, 2),
            'dud_threshold': round(dud_thresh, 2)
        }
    
    def calculate_volatility_index(self, points_series: pd.Series, position: str = None) -> float:
        """
        Calculate a volatility index combining boom/bust tendencies.
        
        Args:
            points_series: Series of fantasy points
            position: Player position
            
        Returns:
            Volatility index (0-100, higher = more volatile)
        """
        if points_series.empty or len(points_series.dropna()) < 2:
            return np.nan
        
        # Get boom/bust rates
        rates = self.calculate_boom_bust_rates(points_series, position)
        
        # Calculate standard deviation relative to mean
        points = points_series.dropna()
        mean_points = points.mean()
        std_points = points.std()
        cv = (std_points / mean_points * 100) if mean_points > 0 else 0
        
        # Combine metrics
        # Higher boom + bust rates = more volatile
        # Higher CV = more volatile
        boom_bust_component = (rates['boom_rate'] + rates['bust_rate']) / 2
        cv_component = min(cv, 100)  # Cap at 100
        
        volatility = (boom_bust_component * 0.6 + cv_component * 0.4)
        
        return round(min(volatility, 100), 2)
    
    def calculate_all_metrics(self, player_df: pd.DataFrame,
                            points_column: str = 'fantasy_points_ppr',
                            position_column: str = 'position') -> Dict[str, any]:
        """
        Calculate all boom/bust metrics for a player.
        
        Args:
            player_df: DataFrame with player's weekly data
            points_column: Column containing fantasy points
            position_column: Column containing position
            
        Returns:
            Dictionary with all boom/bust metrics
        """
        if points_column not in player_df.columns:
            logger.warning(f"Column {points_column} not found")
            return {}
        
        points = player_df[points_column]
        position = player_df[position_column].iloc[0] if position_column in player_df.columns else None
        
        metrics = {}
        
        # Standard boom/bust rates
        metrics.update(self.calculate_boom_bust_rates(points, position))
        
        # Percentile-based rates
        metrics.update(self.calculate_percentile_boom_bust(points))
        
        # Elite/dud rates
        metrics.update(self.calculate_elite_dud_rates(points, position))
        
        # Volatility index
        metrics['volatility_index'] = self.calculate_volatility_index(points, position)
        
        return metrics
    
    def calculate_for_multiple_players(self, df: pd.DataFrame,
                                      player_column: str = 'player_id',
                                      points_column: str = 'fantasy_points_ppr',
                                      position_column: str = 'position',
                                      season: Optional[int] = None) -> pd.DataFrame:
        """
        Calculate boom/bust metrics for multiple players.
        
        Args:
            df: DataFrame with all players' data
            player_column: Column identifying players
            points_column: Column containing fantasy points
            position_column: Column containing position
            season: Optional season filter
            
        Returns:
            DataFrame with boom/bust metrics for each player
        """
        results = []
        
        # Filter by season if specified
        if season and 'season' in df.columns:
            df = df[df['season'] == season]
        
        # Group by player
        for player_id, player_df in df.groupby(player_column):
            metrics = self.calculate_all_metrics(player_df, points_column, position_column)
            
            # Add player identification
            metrics[player_column] = player_id
            
            # Add additional context
            if 'player_name' in player_df.columns:
                metrics['player_name'] = player_df['player_name'].iloc[0]
            if position_column in player_df.columns:
                metrics['position'] = player_df[position_column].iloc[0]
            if 'team' in player_df.columns:
                metrics['team'] = player_df['team'].mode()[0] if not player_df['team'].empty else None
            if season:
                metrics['season'] = season
            
            results.append(metrics)
        
        return pd.DataFrame(results)
    
    def categorize_players(self, metrics_df: pd.DataFrame) -> pd.DataFrame:
        """
        Categorize players based on their boom/bust profiles.
        
        Args:
            metrics_df: DataFrame with boom/bust metrics
            
        Returns:
            DataFrame with player categories added
        """
        df = metrics_df.copy()
        
        def categorize(row):
            if pd.isna(row.get('boom_rate')) or pd.isna(row.get('bust_rate')):
                return 'Unknown'
            
            boom = row['boom_rate']
            bust = row['bust_rate']
            volatility = row.get('volatility_index', 50)
            
            if boom >= 40 and bust <= 20:
                return 'Elite Ceiling'
            elif boom >= 30 and bust <= 25:
                return 'High Upside'
            elif boom <= 20 and bust <= 20:
                return 'Consistent Floor'
            elif boom <= 15 and bust >= 40:
                return 'Avoid'
            elif volatility >= 70:
                return 'Volatile'
            elif volatility <= 30:
                return 'Steady'
            else:
                return 'Balanced'
        
        df['player_category'] = df.apply(categorize, axis=1)
        
        # Add risk level
        def risk_level(row):
            if pd.isna(row.get('volatility_index')):
                return 'Unknown'
            
            vol = row['volatility_index']
            if vol >= 70:
                return 'High Risk'
            elif vol >= 50:
                return 'Medium Risk'
            else:
                return 'Low Risk'
        
        df['risk_level'] = df.apply(risk_level, axis=1)
        
        return df
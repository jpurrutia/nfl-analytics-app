"""
Fantasy Points Calculator
Calculates and verifies fantasy points for different scoring formats
Uses both pre-calculated values from nflverse and custom calculations
"""

import logging
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class FantasyCalculator:
    """
    Calculates fantasy points for various scoring formats.
    Can both calculate from raw stats and verify pre-calculated values.
    """
    
    # Standard scoring system
    STANDARD_SCORING = {
        # Passing
        'passing_yards': 0.04,      # 1 point per 25 yards
        'passing_tds': 4.0,          # 4 points per TD
        'interceptions': -2.0,       # -2 points per INT
        
        # Rushing
        'rushing_yards': 0.1,        # 1 point per 10 yards
        'rushing_tds': 6.0,          # 6 points per TD
        
        # Receiving
        'receiving_yards': 0.1,      # 1 point per 10 yards
        'receiving_tds': 6.0,        # 6 points per TD
        'receptions': 0.0,           # 0 points in standard
        
        # Turnovers
        'fumbles_lost': -2.0,        # -2 points per fumble lost
        
        # 2-point conversions
        'two_point_conversions': 2.0, # 2 points per 2PC
        
        # Kicking
        'extra_points': 1.0,         # 1 point per XP
        'field_goals_0_19': 3.0,     # 3 points for FG 0-19 yards
        'field_goals_20_29': 3.0,    # 3 points for FG 20-29 yards
        'field_goals_30_39': 3.0,    # 3 points for FG 30-39 yards
        'field_goals_40_49': 4.0,    # 4 points for FG 40-49 yards
        'field_goals_50_plus': 5.0,  # 5 points for FG 50+ yards
        'field_goals_missed': 0.0,   # Some leagues: -1
    }
    
    # PPR scoring (adds reception points)
    PPR_SCORING = {
        **STANDARD_SCORING,
        'receptions': 1.0,           # 1 point per reception
    }
    
    # Half-PPR scoring
    HALF_PPR_SCORING = {
        **STANDARD_SCORING,
        'receptions': 0.5,           # 0.5 points per reception
    }
    
    def __init__(self, scoring_system: str = 'standard'):
        """
        Initialize the calculator with a scoring system.
        
        Args:
            scoring_system: 'standard', 'ppr', or 'half_ppr'
        """
        self.scoring_system = scoring_system.lower()
        
        if self.scoring_system == 'standard':
            self.scoring_rules = self.STANDARD_SCORING
        elif self.scoring_system == 'ppr':
            self.scoring_rules = self.PPR_SCORING
        elif self.scoring_system == 'half_ppr':
            self.scoring_rules = self.HALF_PPR_SCORING
        else:
            raise ValueError(f"Unknown scoring system: {scoring_system}")
        
        logger.info(f"Fantasy calculator initialized with {self.scoring_system} scoring")
    
    def calculate_player_points(self, stats: Dict[str, float]) -> float:
        """
        Calculate fantasy points for a player given their stats.
        
        Args:
            stats: Dictionary of player statistics
            
        Returns:
            Total fantasy points
        """
        points = 0.0
        
        for stat, value in stats.items():
            if stat in self.scoring_rules and value is not None:
                points += value * self.scoring_rules[stat]
        
        return round(points, 2)
    
    def calculate_dataframe_points(self, df: pd.DataFrame, 
                                  suffix: str = '') -> pd.DataFrame:
        """
        Calculate fantasy points for all players in a DataFrame.
        
        Args:
            df: DataFrame with player statistics
            suffix: Suffix for the fantasy points column
            
        Returns:
            DataFrame with fantasy points column added
        """
        result_df = df.copy()
        
        # Column name for fantasy points
        if suffix:
            points_col = f'fantasy_points_{suffix}'
        else:
            points_col = f'fantasy_points_{self.scoring_system}'
        
        # Initialize points column
        result_df[points_col] = 0.0
        
        # Calculate points for each stat
        for stat, multiplier in self.scoring_rules.items():
            if stat in result_df.columns:
                # Handle NaN values
                stat_values = result_df[stat].fillna(0)
                result_df[points_col] += stat_values * multiplier
        
        # Round to 2 decimal places
        result_df[points_col] = result_df[points_col].round(2)
        
        return result_df
    
    def verify_fantasy_points(self, df: pd.DataFrame, 
                            actual_col: str,
                            tolerance: float = 0.1) -> pd.DataFrame:
        """
        Verify pre-calculated fantasy points against our calculations.
        
        Args:
            df: DataFrame with stats and pre-calculated points
            actual_col: Column name with actual fantasy points
            tolerance: Acceptable difference in points
            
        Returns:
            DataFrame with verification results
        """
        # Calculate our points
        calc_df = self.calculate_dataframe_points(df, suffix='calculated')
        calc_col = f'fantasy_points_calculated'
        
        # Compare with actual
        if actual_col in calc_df.columns:
            calc_df['points_diff'] = abs(calc_df[calc_col] - calc_df[actual_col])
            calc_df['points_match'] = calc_df['points_diff'] <= tolerance
            
            # Log mismatches
            mismatches = calc_df[~calc_df['points_match']]
            if not mismatches.empty:
                logger.warning(f"Found {len(mismatches)} fantasy point mismatches")
                for idx, row in mismatches.head(5).iterrows():
                    if 'player_name' in row:
                        logger.warning(
                            f"  {row['player_name']}: "
                            f"Actual={row[actual_col]:.2f}, "
                            f"Calculated={row[calc_col]:.2f}, "
                            f"Diff={row['points_diff']:.2f}"
                        )
        else:
            logger.warning(f"Actual points column '{actual_col}' not found")
            calc_df['points_match'] = False
        
        return calc_df
    
    def calculate_half_ppr_from_others(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate half-PPR points as average of standard and PPR.
        
        Args:
            df: DataFrame with standard and PPR points
            
        Returns:
            DataFrame with half-PPR points added
        """
        result_df = df.copy()
        
        if 'fantasy_points' in df.columns and 'fantasy_points_ppr' in df.columns:
            result_df['fantasy_points_half_ppr'] = (
                (df['fantasy_points'] + df['fantasy_points_ppr']) / 2
            ).round(2)
        elif 'fantasy_points_standard' in df.columns and 'fantasy_points_ppr' in df.columns:
            result_df['fantasy_points_half_ppr'] = (
                (df['fantasy_points_standard'] + df['fantasy_points_ppr']) / 2
            ).round(2)
        else:
            logger.warning("Cannot calculate half-PPR: missing standard or PPR points")
        
        return result_df
    
    def calculate_advanced_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate advanced fantasy metrics.
        
        Args:
            df: DataFrame with player stats and fantasy points
            
        Returns:
            DataFrame with advanced metrics added
        """
        result_df = df.copy()
        
        # Touches (rushes + receptions)
        if 'rushing_attempts' in df.columns and 'receptions' in df.columns:
            result_df['touches'] = (
                df['rushing_attempts'].fillna(0) + 
                df['receptions'].fillna(0)
            )
        elif 'carries' in df.columns and 'receptions' in df.columns:
            result_df['touches'] = (
                df['carries'].fillna(0) + 
                df['receptions'].fillna(0)
            )
        
        # Opportunities (targets + rushes for RB/WR, pass attempts for QB)
        if 'targets' in df.columns:
            result_df['opportunities'] = df['targets'].fillna(0)
            if 'rushing_attempts' in df.columns:
                result_df['opportunities'] += df['rushing_attempts'].fillna(0)
        elif 'completions' in df.columns and 'incompletions' in df.columns:
            result_df['opportunities'] = (
                df['completions'].fillna(0) + 
                df['incompletions'].fillna(0)
            )
        
        # Fantasy points per touch
        if 'touches' in result_df.columns:
            result_df['fantasy_points_per_touch'] = np.where(
                result_df['touches'] > 0,
                result_df.get('fantasy_points_ppr', 0) / result_df['touches'],
                0
            ).round(2)
        
        # Fantasy points per opportunity
        if 'opportunities' in result_df.columns:
            result_df['fantasy_points_per_opportunity'] = np.where(
                result_df['opportunities'] > 0,
                result_df.get('fantasy_points_ppr', 0) / result_df['opportunities'],
                0
            ).round(2)
        
        # Target share (if team targets available)
        if 'targets' in df.columns and 'team_targets' in df.columns:
            result_df['target_share'] = np.where(
                df['team_targets'] > 0,
                (df['targets'] / df['team_targets'] * 100),
                0
            ).round(2)
        
        # Red zone efficiency
        if 'red_zone_touches' in df.columns and 'red_zone_tds' in df.columns:
            result_df['red_zone_efficiency'] = np.where(
                df['red_zone_touches'] > 0,
                (df['red_zone_tds'] / df['red_zone_touches'] * 100),
                0
            ).round(2)
        
        return result_df
    
    @staticmethod
    def calculate_consistency_metrics(player_df: pd.DataFrame, 
                                     points_col: str = 'fantasy_points_ppr',
                                     min_games: int = 4) -> Dict[str, float]:
        """
        Calculate consistency metrics for a player across games.
        
        Args:
            player_df: DataFrame with player's game-by-game stats
            points_col: Column with fantasy points
            min_games: Minimum games required for calculation
            
        Returns:
            Dictionary with consistency metrics
        """
        if len(player_df) < min_games:
            return {
                'consistency_score': None,
                'floor': None,
                'ceiling': None,
                'boom_rate': None,
                'bust_rate': None
            }
        
        points = player_df[points_col].values
        
        # Consistency score (inverse of coefficient of variation)
        mean_points = np.mean(points)
        std_points = np.std(points)
        consistency = (1 - (std_points / mean_points)) * 100 if mean_points > 0 else 0
        
        # Floor and ceiling (25th and 75th percentiles)
        floor = np.percentile(points, 25)
        ceiling = np.percentile(points, 75)
        
        # Position-based thresholds for boom/bust
        # These can be adjusted based on position
        if 'position' in player_df.columns:
            position = player_df['position'].iloc[0]
            if position == 'QB':
                boom_threshold = 20
                bust_threshold = 10
            elif position in ['RB', 'WR']:
                boom_threshold = 15
                bust_threshold = 7
            elif position == 'TE':
                boom_threshold = 12
                bust_threshold = 5
            else:
                boom_threshold = 15
                bust_threshold = 7
        else:
            boom_threshold = 15
            bust_threshold = 7
        
        # Boom and bust rates
        boom_rate = (points >= boom_threshold).mean() * 100
        bust_rate = (points <= bust_threshold).mean() * 100
        
        return {
            'consistency_score': round(consistency, 2),
            'floor': round(floor, 2),
            'ceiling': round(ceiling, 2),
            'boom_rate': round(boom_rate, 2),
            'bust_rate': round(bust_rate, 2),
            'boom_threshold': boom_threshold,
            'bust_threshold': bust_threshold,
            'games_played': len(player_df)
        }
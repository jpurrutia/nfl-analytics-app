"""
Matchup Strength Calculator
Analyzes defensive matchups and calculates strength of schedule metrics
"""

import logging
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class MatchupStrengthCalculator:
    """
    Calculates matchup strength metrics for fantasy analysis.
    Evaluates how defenses perform against specific positions.
    """
    
    def __init__(self):
        """Initialize the matchup strength calculator."""
        self.position_groups = {
            'QB': ['QB'],
            'RB': ['RB', 'FB'],
            'WR': ['WR'],
            'TE': ['TE'],
            'K': ['K'],
            'DST': ['DST', 'DEF']
        }
        logger.info("Matchup strength calculator initialized")
    
    def calculate_defense_vs_position(self, df: pd.DataFrame,
                                     defense: str,
                                     position: str,
                                     scoring_format: str = 'ppr') -> Dict:
        """
        Calculate how a defense performs against a specific position.
        
        Args:
            df: DataFrame with game data
            defense: Defense team abbreviation
            position: Position to analyze
            scoring_format: Fantasy scoring format
            
        Returns:
            Dictionary with defensive metrics
        """
        # Filter for games against this defense
        vs_def = df[df['opponent'] == defense]
        
        # Filter for position
        if position in self.position_groups:
            positions = self.position_groups[position]
            vs_def = vs_def[vs_def['position'].isin(positions)]
        else:
            vs_def = vs_def[vs_def['position'] == position]
        
        if vs_def.empty:
            return {'defense': defense, 'position': position, 'games': 0}
        
        # Determine points column
        points_col = f'fantasy_points_{scoring_format}' if scoring_format != 'standard' else 'fantasy_points'
        
        if points_col not in vs_def.columns:
            logger.warning(f"Column {points_col} not found")
            return {'defense': defense, 'position': position, 'games': 0}
        
        metrics = {
            'defense': defense,
            'position': position,
            'games': vs_def['game_id'].nunique() if 'game_id' in vs_def else len(vs_def),
            'points_allowed_avg': round(vs_def[points_col].mean(), 2),
            'points_allowed_median': round(vs_def[points_col].median(), 2),
            'points_allowed_std': round(vs_def[points_col].std(), 2),
            'points_allowed_min': round(vs_def[points_col].min(), 2),
            'points_allowed_max': round(vs_def[points_col].max(), 2)
        }
        
        # Position-specific metrics
        if position in ['RB', 'FB']:
            metrics.update(self._calculate_rb_defense_metrics(vs_def))
        elif position == 'WR':
            metrics.update(self._calculate_wr_defense_metrics(vs_def))
        elif position == 'TE':
            metrics.update(self._calculate_te_defense_metrics(vs_def))
        elif position == 'QB':
            metrics.update(self._calculate_qb_defense_metrics(vs_def))
        
        return metrics
    
    def _calculate_rb_defense_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate RB-specific defensive metrics."""
        return {
            'rushing_yards_allowed_avg': round(df['rushing_yards'].mean(), 2) if 'rushing_yards' in df else 0,
            'rushing_tds_allowed_avg': round(df['rushing_touchdowns'].mean(), 2) if 'rushing_touchdowns' in df else 0,
            'rushing_attempts_allowed_avg': round(df['rushing_attempts'].mean(), 2) if 'rushing_attempts' in df else 0,
            'receptions_allowed_avg': round(df['receptions'].mean(), 2) if 'receptions' in df else 0,
            'receiving_yards_allowed_avg': round(df['receiving_yards'].mean(), 2) if 'receiving_yards' in df else 0
        }
    
    def _calculate_wr_defense_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate WR-specific defensive metrics."""
        return {
            'targets_allowed_avg': round(df['targets'].mean(), 2) if 'targets' in df else 0,
            'receptions_allowed_avg': round(df['receptions'].mean(), 2) if 'receptions' in df else 0,
            'receiving_yards_allowed_avg': round(df['receiving_yards'].mean(), 2) if 'receiving_yards' in df else 0,
            'receiving_tds_allowed_avg': round(df['receiving_touchdowns'].mean(), 2) if 'receiving_touchdowns' in df else 0,
            'catch_rate_allowed': round(
                (df['receptions'].sum() / df['targets'].sum() * 100) if df['targets'].sum() > 0 else 0, 2
            ) if 'targets' in df and 'receptions' in df else 0
        }
    
    def _calculate_te_defense_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate TE-specific defensive metrics."""
        return {
            'targets_allowed_avg': round(df['targets'].mean(), 2) if 'targets' in df else 0,
            'receptions_allowed_avg': round(df['receptions'].mean(), 2) if 'receptions' in df else 0,
            'receiving_yards_allowed_avg': round(df['receiving_yards'].mean(), 2) if 'receiving_yards' in df else 0,
            'receiving_tds_allowed_avg': round(df['receiving_touchdowns'].mean(), 2) if 'receiving_touchdowns' in df else 0
        }
    
    def _calculate_qb_defense_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate QB-specific defensive metrics."""
        return {
            'passing_yards_allowed_avg': round(df['passing_yards'].mean(), 2) if 'passing_yards' in df else 0,
            'passing_tds_allowed_avg': round(df['passing_touchdowns'].mean(), 2) if 'passing_touchdowns' in df else 0,
            'completions_allowed_avg': round(df['completions'].mean(), 2) if 'completions' in df else 0,
            'interceptions_forced_avg': round(df['interceptions'].mean(), 2) if 'interceptions' in df else 0,
            'sacks_avg': round(df['sacks_taken'].mean(), 2) if 'sacks_taken' in df else 0
        }
    
    def rank_defenses_by_position(self, df: pd.DataFrame,
                                 position: str,
                                 scoring_format: str = 'ppr',
                                 min_games: int = 4) -> pd.DataFrame:
        """
        Rank all defenses by how they perform against a position.
        
        Args:
            df: DataFrame with game data
            position: Position to analyze
            scoring_format: Fantasy scoring format
            min_games: Minimum games for ranking
            
        Returns:
            DataFrame with defense rankings
        """
        defenses = df['opponent'].unique() if 'opponent' in df else []
        
        results = []
        for defense in defenses:
            metrics = self.calculate_defense_vs_position(
                df, defense, position, scoring_format
            )
            if metrics['games'] >= min_games:
                results.append(metrics)
        
        if not results:
            return pd.DataFrame()
        
        rankings_df = pd.DataFrame(results)
        
        # Rank defenses (lower points allowed is better for defense)
        rankings_df['defense_rank'] = rankings_df['points_allowed_avg'].rank(method='min').astype(int)
        
        # Calculate relative strength (vs league average)
        league_avg = rankings_df['points_allowed_avg'].mean()
        rankings_df['vs_avg_pct'] = round(
            ((rankings_df['points_allowed_avg'] - league_avg) / league_avg * 100), 2
        )
        
        # Categorize defense strength
        rankings_df['matchup_rating'] = rankings_df.apply(
            lambda x: self._categorize_matchup(x['vs_avg_pct']), axis=1
        )
        
        return rankings_df.sort_values('defense_rank')
    
    def _categorize_matchup(self, vs_avg_pct: float) -> str:
        """
        Categorize matchup difficulty based on vs average percentage.
        
        Args:
            vs_avg_pct: Percentage vs league average
            
        Returns:
            Matchup category
        """
        if vs_avg_pct >= 20:
            return 'Elite Matchup'  # Defense allows 20%+ more than average
        elif vs_avg_pct >= 10:
            return 'Good Matchup'
        elif vs_avg_pct >= -10:
            return 'Neutral Matchup'
        elif vs_avg_pct >= -20:
            return 'Tough Matchup'
        else:
            return 'Avoid'  # Defense allows 20%+ less than average
    
    def calculate_strength_of_schedule(self, df: pd.DataFrame,
                                      player_id: str,
                                      weeks_ahead: int = 6) -> Dict:
        """
        Calculate strength of schedule for upcoming games.
        
        Args:
            df: DataFrame with schedule and defensive data
            player_id: Player to analyze
            weeks_ahead: Number of weeks to look ahead
            
        Returns:
            Dictionary with SOS metrics
        """
        # Get player info
        player_df = df[df['player_id'] == player_id]
        
        if player_df.empty:
            return {'player_id': player_id, 'sos_rating': 'unknown'}
        
        position = player_df['position'].iloc[0]
        team = player_df['team'].iloc[0]
        
        # Get upcoming opponents (simplified - would need schedule data)
        # This is a placeholder for actual schedule lookup
        upcoming_opponents = self._get_upcoming_opponents(team, weeks_ahead)
        
        if not upcoming_opponents:
            return {
                'player_id': player_id,
                'position': position,
                'team': team,
                'sos_rating': 'unknown'
            }
        
        # Calculate average defense rank for upcoming opponents
        defense_ranks = []
        for opponent in upcoming_opponents:
            defense_metrics = self.calculate_defense_vs_position(
                df, opponent, position
            )
            if defense_metrics['games'] > 0:
                # Higher points allowed = easier matchup = lower difficulty
                defense_ranks.append(defense_metrics['points_allowed_avg'])
        
        if not defense_ranks:
            return {
                'player_id': player_id,
                'position': position,
                'team': team,
                'sos_rating': 'unknown'
            }
        
        avg_points_allowed = np.mean(defense_ranks)
        league_avg = df.groupby('opponent')[f'fantasy_points_ppr'].mean().mean()
        
        sos_score = (avg_points_allowed - league_avg) / league_avg * 100
        
        return {
            'player_id': player_id,
            'position': position,
            'team': team,
            'upcoming_opponents': upcoming_opponents,
            'avg_points_allowed': round(avg_points_allowed, 2),
            'sos_score': round(sos_score, 2),
            'sos_rating': self._categorize_sos(sos_score)
        }
    
    def _get_upcoming_opponents(self, team: str, weeks_ahead: int) -> List[str]:
        """
        Get upcoming opponents for a team.
        Note: This would need actual schedule data.
        
        Args:
            team: Team abbreviation
            weeks_ahead: Number of weeks to look ahead
            
        Returns:
            List of opponent abbreviations
        """
        # Placeholder - would need actual schedule data
        # This would typically query a schedule table
        return []
    
    def _categorize_sos(self, sos_score: float) -> str:
        """
        Categorize strength of schedule.
        
        Args:
            sos_score: SOS score (positive = easier)
            
        Returns:
            SOS category
        """
        if sos_score >= 15:
            return 'Very Easy'
        elif sos_score >= 5:
            return 'Easy'
        elif sos_score >= -5:
            return 'Average'
        elif sos_score >= -15:
            return 'Difficult'
        else:
            return 'Very Difficult'
    
    def calculate_matchup_history(self, df: pd.DataFrame,
                                 player_id: str,
                                 opponent: str) -> Dict:
        """
        Calculate historical performance against specific opponent.
        
        Args:
            df: DataFrame with game data
            player_id: Player to analyze
            opponent: Opponent team
            
        Returns:
            Dictionary with historical matchup data
        """
        # Filter for player games against opponent
        matchup_df = df[
            (df['player_id'] == player_id) & 
            (df['opponent'] == opponent)
        ]
        
        if matchup_df.empty:
            return {
                'player_id': player_id,
                'opponent': opponent,
                'games_played': 0
            }
        
        # Calculate historical stats
        metrics = {
            'player_id': player_id,
            'opponent': opponent,
            'games_played': len(matchup_df),
            'avg_fantasy_points': round(matchup_df['fantasy_points_ppr'].mean(), 2)
            if 'fantasy_points_ppr' in matchup_df else 0,
            'min_fantasy_points': round(matchup_df['fantasy_points_ppr'].min(), 2)
            if 'fantasy_points_ppr' in matchup_df else 0,
            'max_fantasy_points': round(matchup_df['fantasy_points_ppr'].max(), 2)
            if 'fantasy_points_ppr' in matchup_df else 0
        }
        
        # Compare to season average
        season_avg = df[df['player_id'] == player_id]['fantasy_points_ppr'].mean()
        if season_avg > 0:
            metrics['vs_season_avg_pct'] = round(
                ((metrics['avg_fantasy_points'] - season_avg) / season_avg * 100), 2
            )
            
            if metrics['vs_season_avg_pct'] >= 10:
                metrics['historical_success'] = 'Strong'
            elif metrics['vs_season_avg_pct'] >= -10:
                metrics['historical_success'] = 'Average'
            else:
                metrics['historical_success'] = 'Struggles'
        
        return metrics
    
    def calculate_pace_metrics(self, df: pd.DataFrame, team: str) -> Dict:
        """
        Calculate pace metrics that affect fantasy scoring.
        
        Args:
            df: DataFrame with play-by-play data
            team: Team to analyze
            
        Returns:
            Dictionary with pace metrics
        """
        team_df = df[df['posteam'] == team]
        
        if team_df.empty:
            return {'team': team, 'plays_per_game': 0}
        
        games = team_df['game_id'].nunique() if 'game_id' in team_df else 1
        
        metrics = {
            'team': team,
            'games': games,
            'plays_per_game': round(len(team_df) / games, 2),
            'pass_rate': round(
                team_df['pass_attempt'].sum() / len(team_df) * 100, 2
            ) if 'pass_attempt' in team_df else 0,
            'seconds_per_play': round(
                team_df['time_to_snap'].mean(), 2
            ) if 'time_to_snap' in team_df else 0,
            'no_huddle_rate': round(
                team_df['no_huddle'].sum() / len(team_df) * 100, 2
            ) if 'no_huddle' in team_df else 0
        }
        
        # Categorize pace
        if metrics['plays_per_game'] >= 70:
            metrics['pace_rating'] = 'Very Fast'
        elif metrics['plays_per_game'] >= 65:
            metrics['pace_rating'] = 'Fast'
        elif metrics['plays_per_game'] >= 60:
            metrics['pace_rating'] = 'Average'
        elif metrics['plays_per_game'] >= 55:
            metrics['pace_rating'] = 'Slow'
        else:
            metrics['pace_rating'] = 'Very Slow'
        
        return metrics
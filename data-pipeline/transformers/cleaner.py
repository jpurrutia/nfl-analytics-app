"""
Data Cleaner
Cleans and standardizes NFL data for consistency
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class DataCleaner:
    """
    Cleans and standardizes NFL data from various sources.
    """
    
    # Team name mappings for consistency
    TEAM_MAPPINGS = {
        'ARI': 'ARI', 'ARZ': 'ARI',  # Arizona Cardinals
        'ATL': 'ATL',  # Atlanta Falcons
        'BAL': 'BAL',  # Baltimore Ravens
        'BUF': 'BUF',  # Buffalo Bills
        'CAR': 'CAR',  # Carolina Panthers
        'CHI': 'CHI',  # Chicago Bears
        'CIN': 'CIN',  # Cincinnati Bengals
        'CLE': 'CLE',  # Cleveland Browns
        'DAL': 'DAL',  # Dallas Cowboys
        'DEN': 'DEN',  # Denver Broncos
        'DET': 'DET',  # Detroit Lions
        'GB': 'GB', 'GNB': 'GB',  # Green Bay Packers
        'HOU': 'HOU',  # Houston Texans
        'IND': 'IND',  # Indianapolis Colts
        'JAC': 'JAX', 'JAX': 'JAX',  # Jacksonville Jaguars
        'KC': 'KC', 'KAN': 'KC',  # Kansas City Chiefs
        'LA': 'LAR', 'LAR': 'LAR',  # Los Angeles Rams
        'LAC': 'LAC', 'SD': 'LAC',  # Los Angeles Chargers
        'LV': 'LV', 'LVR': 'LV', 'OAK': 'LV',  # Las Vegas Raiders
        'MIA': 'MIA',  # Miami Dolphins
        'MIN': 'MIN',  # Minnesota Vikings
        'NE': 'NE', 'NWE': 'NE',  # New England Patriots
        'NO': 'NO', 'NOR': 'NO',  # New Orleans Saints
        'NYG': 'NYG',  # New York Giants
        'NYJ': 'NYJ',  # New York Jets
        'PHI': 'PHI',  # Philadelphia Eagles
        'PIT': 'PIT',  # Pittsburgh Steelers
        'SEA': 'SEA',  # Seattle Seahawks
        'SF': 'SF', 'SFO': 'SF',  # San Francisco 49ers
        'TB': 'TB', 'TAM': 'TB',  # Tampa Bay Buccaneers
        'TEN': 'TEN',  # Tennessee Titans
        'WAS': 'WAS', 'WSH': 'WAS',  # Washington Commanders
    }
    
    # Position standardization
    POSITION_MAPPINGS = {
        'QB': 'QB',
        'RB': 'RB', 'HB': 'RB', 'FB': 'RB',
        'WR': 'WR',
        'TE': 'TE',
        'K': 'K', 'PK': 'K',
        'DST': 'DST', 'DEF': 'DST', 'D/ST': 'DST',
        'DB': 'DB', 'CB': 'DB', 'S': 'DB', 'SS': 'DB', 'FS': 'DB',
        'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB',
        'DL': 'DL', 'DE': 'DL', 'DT': 'DL', 'NT': 'DL',
        'OL': 'OL', 'C': 'OL', 'G': 'OL', 'T': 'OL', 'OG': 'OL', 'OT': 'OL'
    }
    
    def __init__(self):
        """Initialize the data cleaner."""
        logger.info("Data cleaner initialized")
    
    def clean_player_names(self, df: pd.DataFrame, 
                          name_column: str = 'player_name') -> pd.DataFrame:
        """
        Standardize player names for consistency.
        
        Args:
            df: DataFrame with player names
            name_column: Column containing player names
            
        Returns:
            DataFrame with cleaned player names
        """
        result_df = df.copy()
        
        if name_column not in result_df.columns:
            logger.warning(f"Column '{name_column}' not found")
            return result_df
        
        # Remove extra whitespace
        result_df[name_column] = result_df[name_column].str.strip()
        
        # Standardize suffixes (Jr., Sr., III, etc.)
        result_df[name_column] = result_df[name_column].str.replace(
            r'\s+(Jr\.?|Sr\.?|III|II|IV)$', r' \1', regex=True
        )
        
        # Remove periods from initials
        result_df[name_column] = result_df[name_column].str.replace(
            r'([A-Z])\.', r'\1', regex=True
        )
        
        # Fix common name issues
        name_fixes = {
            'Patrick Mahomes II': 'Patrick Mahomes',
            'Odell Beckham Jr': 'Odell Beckham Jr.',
            'Marvin Jones Jr': 'Marvin Jones Jr.',
        }
        
        for old_name, new_name in name_fixes.items():
            result_df.loc[result_df[name_column] == old_name, name_column] = new_name
        
        logger.info(f"Cleaned {len(result_df)} player names")
        
        return result_df
    
    def standardize_teams(self, df: pd.DataFrame, 
                         team_columns: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Standardize team abbreviations.
        
        Args:
            df: DataFrame with team data
            team_columns: List of columns containing team abbreviations
            
        Returns:
            DataFrame with standardized team names
        """
        result_df = df.copy()
        
        if team_columns is None:
            # Find columns that likely contain team names
            team_columns = [col for col in df.columns 
                           if any(x in col.lower() for x in ['team', 'tm', 'club'])]
        
        for col in team_columns:
            if col in result_df.columns:
                result_df[col] = result_df[col].map(
                    lambda x: self.TEAM_MAPPINGS.get(str(x).upper(), x) if pd.notna(x) else x
                )
                logger.info(f"Standardized teams in column '{col}'")
        
        return result_df
    
    def standardize_positions(self, df: pd.DataFrame,
                            position_column: str = 'position') -> pd.DataFrame:
        """
        Standardize position abbreviations.
        
        Args:
            df: DataFrame with position data
            position_column: Column containing positions
            
        Returns:
            DataFrame with standardized positions
        """
        result_df = df.copy()
        
        if position_column in result_df.columns:
            result_df[position_column] = result_df[position_column].map(
                lambda x: self.POSITION_MAPPINGS.get(str(x).upper(), x) if pd.notna(x) else x
            )
            logger.info(f"Standardized positions in column '{position_column}'")
        
        return result_df
    
    def clean_numeric_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean numeric columns by handling NaN and inf values.
        
        Args:
            df: DataFrame to clean
            
        Returns:
            DataFrame with cleaned numeric columns
        """
        result_df = df.copy()
        
        # Get numeric columns
        numeric_columns = result_df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            # Replace inf with NaN
            result_df[col] = result_df[col].replace([np.inf, -np.inf], np.nan)
            
            # For certain columns, NaN should be 0
            zero_fill_patterns = [
                'yards', 'attempts', 'completions', 'carries', 'targets',
                'receptions', 'touchdowns', 'tds', 'interceptions', 'fumbles'
            ]
            
            if any(pattern in col.lower() for pattern in zero_fill_patterns):
                result_df[col] = result_df[col].fillna(0)
        
        logger.info(f"Cleaned {len(numeric_columns)} numeric columns")
        
        return result_df
    
    def generate_player_id(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate consistent player IDs if missing.
        
        Args:
            df: DataFrame with player data
            
        Returns:
            DataFrame with player IDs
        """
        result_df = df.copy()
        
        if 'player_id' not in result_df.columns or result_df['player_id'].isna().any():
            # Generate ID from name + position + team
            if all(col in result_df.columns for col in ['player_name', 'position', 'team']):
                result_df['generated_player_id'] = (
                    result_df['player_name'].str.lower().str.replace(r'[^a-z]', '', regex=True) + 
                    '_' + result_df['position'].fillna('UNK') + 
                    '_' + result_df['team'].fillna('UNK')
                )
                
                # Use generated ID where player_id is missing
                if 'player_id' not in result_df.columns:
                    result_df['player_id'] = result_df['generated_player_id']
                else:
                    result_df['player_id'] = result_df['player_id'].fillna(
                        result_df['generated_player_id']
                    )
                
                result_df = result_df.drop('generated_player_id', axis=1)
                
                logger.info("Generated player IDs for missing values")
        
        return result_df
    
    def clean_play_by_play(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean play-by-play data specifically.
        
        Args:
            df: Play-by-play DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        result_df = df.copy()
        
        # Standardize teams
        team_cols = ['home_team', 'away_team', 'posteam', 'defteam']
        result_df = self.standardize_teams(result_df, team_cols)
        
        # Clean player names
        player_name_cols = [col for col in result_df.columns if 'player_name' in col]
        for col in player_name_cols:
            result_df = self.clean_player_names(result_df, col)
        
        # Clean numeric columns
        result_df = self.clean_numeric_columns(result_df)
        
        # Generate composite keys
        if 'game_id' in result_df.columns and 'play_id' in result_df.columns:
            result_df['play_key'] = (
                result_df['game_id'].astype(str) + '_' + 
                result_df['play_id'].astype(str)
            )
        
        # Fix date columns
        if 'game_date' in result_df.columns:
            result_df['game_date'] = pd.to_datetime(result_df['game_date']).dt.date
        
        logger.info(f"Cleaned {len(result_df)} play-by-play records")
        
        return result_df
    
    def clean_weekly_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean weekly stats data specifically.
        
        Args:
            df: Weekly stats DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        result_df = df.copy()
        
        # Standard cleaning
        result_df = self.clean_player_names(result_df)
        result_df = self.standardize_teams(result_df)
        result_df = self.standardize_positions(result_df)
        result_df = self.clean_numeric_columns(result_df)
        result_df = self.generate_player_id(result_df)
        
        # Generate composite key
        if all(col in result_df.columns for col in ['player_id', 'season', 'week']):
            result_df['player_week_key'] = (
                result_df['player_id'].astype(str) + '_' +
                result_df['season'].astype(str) + '_' +
                result_df['week'].astype(str)
            )
        
        # Ensure required columns have defaults
        default_values = {
            'games_played': 1,
            'snaps': 0,
            'snap_percentage': 0.0
        }
        
        for col, default_val in default_values.items():
            if col not in result_df.columns:
                result_df[col] = default_val
        
        logger.info(f"Cleaned {len(result_df)} weekly stat records")
        
        return result_df
    
    def deduplicate_data(self, df: pd.DataFrame, 
                        key_columns: List[str],
                        keep: str = 'last') -> pd.DataFrame:
        """
        Remove duplicate records based on key columns.
        
        Args:
            df: DataFrame to deduplicate
            key_columns: Columns that form the unique key
            keep: Which duplicate to keep ('first', 'last', False)
            
        Returns:
            Deduplicated DataFrame
        """
        original_len = len(df)
        result_df = df.drop_duplicates(subset=key_columns, keep=keep)
        
        removed = original_len - len(result_df)
        if removed > 0:
            logger.info(f"Removed {removed} duplicate records")
        
        return result_df
    
    def validate_data_quality(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Validate data quality and return metrics.
        
        Args:
            df: DataFrame to validate
            
        Returns:
            Tuple of (DataFrame, quality metrics)
        """
        quality_metrics = {
            'total_records': len(df),
            'null_counts': {},
            'unique_counts': {},
            'data_types': {},
            'issues': []
        }
        
        for col in df.columns:
            # Null counts
            null_count = df[col].isna().sum()
            if null_count > 0:
                quality_metrics['null_counts'][col] = null_count
            
            # Unique counts for categorical columns
            if df[col].dtype == 'object':
                unique_count = df[col].nunique()
                quality_metrics['unique_counts'][col] = unique_count
            
            # Data type
            quality_metrics['data_types'][col] = str(df[col].dtype)
        
        # Check for specific issues
        if 'season' in df.columns:
            invalid_seasons = df[(df['season'] < 2000) | (df['season'] > 2030)]
            if not invalid_seasons.empty:
                quality_metrics['issues'].append(
                    f"Found {len(invalid_seasons)} records with invalid seasons"
                )
        
        if 'week' in df.columns:
            invalid_weeks = df[(df['week'] < 1) | (df['week'] > 22)]
            if not invalid_weeks.empty:
                quality_metrics['issues'].append(
                    f"Found {len(invalid_weeks)} records with invalid weeks"
                )
        
        logger.info(f"Data quality check complete: {len(quality_metrics['issues'])} issues found")
        
        return df, quality_metrics
"""
NFLverse data extractor for play-by-play and player statistics
Uses nfl_data_py library to fetch data from the nflverse project
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import nfl_data_py as nfl

from extractors.base_extractor import BaseExtractor
from extractors.config import DATA_SOURCES

logger = logging.getLogger(__name__)


class NFLverseExtractor(BaseExtractor):
    """
    Extractor for NFL data from the nflverse project.
    Handles play-by-play data, weekly stats, and roster information.
    """
    
    def __init__(self):
        """Initialize the NFLverse extractor."""
        config = DATA_SOURCES.get('nflverse', {})
        super().__init__('nflverse', config)
        
        # Cache for data to avoid repeated downloads
        self._cache = {}
        
        logger.info("NFLverse extractor initialized")
    
    def extract(self, data_type: str = 'play_by_play', **kwargs) -> pd.DataFrame:
        """
        Extract data from NFLverse based on the specified type.
        
        Args:
            data_type: Type of data to extract ('play_by_play', 'weekly_stats', 'roster')
            **kwargs: Additional arguments for extraction
            
        Returns:
            DataFrame with extracted data
        """
        if data_type == 'play_by_play':
            return self._extract_play_by_play(**kwargs)
        elif data_type == 'weekly_stats':
            return self._extract_weekly_stats(**kwargs)
        elif data_type == 'roster':
            return self._extract_roster(**kwargs)
        else:
            raise ValueError(f"Unknown data type: {data_type}")
    
    def _extract_play_by_play(self, seasons: List[int] = None, weeks: List[int] = None) -> pd.DataFrame:
        """
        Extract play-by-play data for specified seasons.
        
        Args:
            seasons: List of seasons to extract (default: from config)
            weeks: List of weeks to extract (default: all weeks)
            
        Returns:
            DataFrame with play-by-play data
        """
        pbp_config = self.config.get('play_by_play', {})
        seasons = seasons or pbp_config.get('seasons', [2023])
        columns = pbp_config.get('columns', [])
        
        logger.info(f"Extracting play-by-play data for seasons: {seasons}")
        
        try:
            # Check cache first
            cache_key = f"pbp_{'-'.join(map(str, seasons))}"
            if cache_key in self._cache:
                logger.info("Using cached play-by-play data")
                return self._cache[cache_key]
            
            # Import play-by-play data
            pbp_df = nfl.import_pbp_data(seasons)
            
            if pbp_df is None or pbp_df.empty:
                logger.warning("No play-by-play data returned")
                return pd.DataFrame()
            
            logger.info(f"Extracted {len(pbp_df)} play records")
            
            # Filter weeks if specified
            if weeks:
                pbp_df = pbp_df[pbp_df['week'].isin(weeks)]
                logger.info(f"Filtered to {len(pbp_df)} records for weeks {weeks}")
            
            # Filter columns if specified
            if columns:
                available_columns = [col for col in columns if col in pbp_df.columns]
                missing_columns = [col for col in columns if col not in pbp_df.columns]
                
                if missing_columns:
                    logger.warning(f"Missing columns: {missing_columns}")
                
                if available_columns:
                    pbp_df = pbp_df[available_columns]
                    logger.info(f"Selected {len(available_columns)} columns")
            
            # Add metadata
            pbp_df['source'] = 'nflverse'
            pbp_df['extraction_date'] = datetime.now()
            
            # Cache the data
            self._cache[cache_key] = pbp_df
            
            return pbp_df
            
        except Exception as e:
            logger.error(f"Failed to extract play-by-play data: {e}")
            raise
    
    def _extract_weekly_stats(self, seasons: List[int] = None, 
                            positions: List[str] = None,
                            stat_type: str = 'offense') -> pd.DataFrame:
        """
        Extract weekly player statistics.
        
        Args:
            seasons: List of seasons to extract
            positions: List of positions to include
            stat_type: Type of stats ('offense', 'kicking')
            
        Returns:
            DataFrame with weekly stats
        """
        stats_config = self.config.get('weekly_stats', {})
        seasons = seasons or stats_config.get('seasons', [2023])
        positions = positions or stats_config.get('positions', ['QB', 'RB', 'WR', 'TE'])
        stat_type = stat_type or stats_config.get('stat_type', 'offense')
        
        logger.info(f"Extracting weekly {stat_type} stats for seasons: {seasons}")
        
        try:
            all_stats = []
            
            for season in seasons:
                cache_key = f"stats_{season}_{stat_type}"
                
                if cache_key in self._cache:
                    logger.info(f"Using cached stats for {season}")
                    stats_df = self._cache[cache_key]
                else:
                    # Import weekly stats
                    if stat_type == 'offense':
                        stats_df = nfl.import_weekly_data([season])
                    elif stat_type == 'kicking':
                        # For kickers, we might need different data
                        stats_df = nfl.import_weekly_data([season])
                        stats_df = stats_df[stats_df['position'] == 'K']
                    else:
                        logger.warning(f"Unknown stat type: {stat_type}")
                        continue
                    
                    if stats_df is not None and not stats_df.empty:
                        self._cache[cache_key] = stats_df
                    else:
                        logger.warning(f"No stats data for season {season}")
                        continue
                
                # Filter by position
                if positions and 'position' in stats_df.columns:
                    stats_df = stats_df[stats_df['position'].isin(positions)]
                
                all_stats.append(stats_df)
            
            if all_stats:
                result_df = pd.concat(all_stats, ignore_index=True)
                logger.info(f"Extracted {len(result_df)} stat records")
                
                # Add metadata
                result_df['source'] = 'nflverse'
                result_df['extraction_date'] = datetime.now()
                
                return result_df
            else:
                logger.warning("No weekly stats extracted")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"Failed to extract weekly stats: {e}")
            raise
    
    def _extract_roster(self, seasons: List[int] = None) -> pd.DataFrame:
        """
        Extract roster data for specified seasons.
        
        Args:
            seasons: List of seasons to extract
            
        Returns:
            DataFrame with roster data
        """
        roster_config = self.config.get('roster', {})
        seasons = seasons or roster_config.get('seasons', [2023])
        
        logger.info(f"Extracting roster data for seasons: {seasons}")
        
        try:
            all_rosters = []
            
            for season in seasons:
                cache_key = f"roster_{season}"
                
                if cache_key in self._cache:
                    logger.info(f"Using cached roster for {season}")
                    roster_df = self._cache[cache_key]
                else:
                    # Import roster data
                    roster_df = nfl.import_rosters([season])
                    
                    if roster_df is not None and not roster_df.empty:
                        self._cache[cache_key] = roster_df
                    else:
                        logger.warning(f"No roster data for season {season}")
                        continue
                
                all_rosters.append(roster_df)
            
            if all_rosters:
                result_df = pd.concat(all_rosters, ignore_index=True)
                logger.info(f"Extracted {len(result_df)} roster records")
                
                # Add metadata
                result_df['source'] = 'nflverse'
                result_df['extraction_date'] = datetime.now()
                
                return result_df
            else:
                logger.warning("No roster data extracted")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"Failed to extract roster data: {e}")
            raise
    
    def validate(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Validate extracted NFLverse data.
        
        Args:
            data: DataFrame to validate
            
        Returns:
            Tuple of (validated DataFrame, list of validation errors)
        """
        errors = []
        validated_df = data.copy()
        
        # Check for required columns based on data type
        if 'play_id' in data.columns:  # Play-by-play data
            required_cols = ['game_id', 'play_id', 'season', 'week']
        elif 'player_id' in data.columns:  # Player stats
            required_cols = ['player_id', 'season', 'week']
        else:
            required_cols = ['season']
        
        # Check required columns
        missing_cols = [col for col in required_cols if col not in validated_df.columns]
        if missing_cols:
            errors.append(f"Missing required columns: {missing_cols}")
            return pd.DataFrame(), errors
        
        # Remove duplicates
        if 'play_id' in validated_df.columns and 'game_id' in validated_df.columns:
            original_len = len(validated_df)
            validated_df = validated_df.drop_duplicates(subset=['game_id', 'play_id'])
            if len(validated_df) < original_len:
                errors.append(f"Removed {original_len - len(validated_df)} duplicate plays")
        
        # Validate data types and ranges
        if 'season' in validated_df.columns:
            # Check season is reasonable
            current_year = datetime.now().year
            invalid_seasons = validated_df[
                (validated_df['season'] < 2000) | 
                (validated_df['season'] > current_year + 1)
            ]
            if not invalid_seasons.empty:
                errors.append(f"Found {len(invalid_seasons)} records with invalid seasons")
                validated_df = validated_df[
                    (validated_df['season'] >= 2000) & 
                    (validated_df['season'] <= current_year + 1)
                ]
        
        if 'week' in validated_df.columns:
            # Check week is valid (1-22 for regular + playoffs)
            invalid_weeks = validated_df[
                (validated_df['week'] < 1) | 
                (validated_df['week'] > 22)
            ]
            if not invalid_weeks.empty:
                errors.append(f"Found {len(invalid_weeks)} records with invalid weeks")
                validated_df = validated_df[
                    (validated_df['week'] >= 1) & 
                    (validated_df['week'] <= 22)
                ]
        
        # Check for null values in critical columns
        for col in required_cols:
            null_count = validated_df[col].isnull().sum()
            if null_count > 0:
                errors.append(f"Found {null_count} null values in {col}")
                validated_df = validated_df[validated_df[col].notna()]
        
        # Validate numeric columns
        numeric_validations = {
            'yards_gained': (-99, 99),
            'air_yards': (-99, 99),
            'yards_after_catch': (0, 99),
            'fantasy_points_ppr': (-10, 100)
        }
        
        for col, (min_val, max_val) in numeric_validations.items():
            if col in validated_df.columns:
                # Check for out-of-range values
                out_of_range = validated_df[
                    (validated_df[col] < min_val) | 
                    (validated_df[col] > max_val)
                ]
                if not out_of_range.empty:
                    errors.append(f"Found {len(out_of_range)} records with {col} out of range [{min_val}, {max_val}]")
                    # Cap values rather than removing records
                    validated_df.loc[validated_df[col] < min_val, col] = min_val
                    validated_df.loc[validated_df[col] > max_val, col] = max_val
        
        logger.info(f"Validation complete: {len(validated_df)} valid records, {len(errors)} issues")
        
        return validated_df, errors
    
    def extract_incremental(self, table_name: str, 
                          data_type: str = 'play_by_play',
                          force_full: bool = False) -> pd.DataFrame:
        """
        Extract data incrementally based on what's already in the database.
        
        Args:
            table_name: Target table to check for existing data
            data_type: Type of data to extract
            force_full: Force full extraction regardless of existing data
            
        Returns:
            DataFrame with new data to load
        """
        if force_full:
            logger.info("Forcing full extraction")
            return self.extract(data_type=data_type)
        
        try:
            # Check what data already exists
            existing_data = self.db_manager.execute_query_df(f"""
                SELECT 
                    MAX(season) as max_season,
                    MAX(week) as max_week,
                    COUNT(DISTINCT season) as season_count
                FROM bronze.{table_name}
            """)
            
            if existing_data.empty or existing_data.iloc[0]['max_season'] is None:
                logger.info("No existing data, performing full extraction")
                return self.extract(data_type=data_type)
            
            max_season = int(existing_data.iloc[0]['max_season'])
            max_week = int(existing_data.iloc[0]['max_week'])
            
            logger.info(f"Latest data in database: Season {max_season}, Week {max_week}")
            
            # Determine what new data to extract
            current_year = datetime.now().year
            current_month = datetime.now().month
            
            if current_month >= 9:  # Football season
                current_season = current_year
            else:
                current_season = current_year - 1
            
            if max_season < current_season:
                # Extract from next season onwards
                seasons_to_extract = list(range(max_season + 1, current_season + 1))
                logger.info(f"Extracting new seasons: {seasons_to_extract}")
                return self.extract(data_type=data_type, seasons=seasons_to_extract)
            elif max_season == current_season and max_week < 22:
                # Extract newer weeks from current season
                logger.info(f"Extracting weeks {max_week + 1} onwards for season {current_season}")
                data = self.extract(data_type=data_type, seasons=[current_season])
                if 'week' in data.columns:
                    return data[data['week'] > max_week]
                return data
            else:
                logger.info("Data is up to date")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"Failed to check existing data, performing full extraction: {e}")
            return self.extract(data_type=data_type)
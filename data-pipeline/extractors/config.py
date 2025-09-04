"""
Configuration for data extraction sources and settings
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

# NFL seasons to extract (last 5 seasons)
CURRENT_YEAR = datetime.now().year
CURRENT_MONTH = datetime.now().month

# Determine the most recent completed season
if CURRENT_MONTH >= 9:  # September or later, current season is in progress
    MOST_RECENT_SEASON = CURRENT_YEAR
else:
    MOST_RECENT_SEASON = CURRENT_YEAR - 1

# Extract last 5 seasons of data
SEASONS_TO_EXTRACT = list(range(MOST_RECENT_SEASON - 4, MOST_RECENT_SEASON + 1))

# Data source configurations
DATA_SOURCES = {
    'nflverse': {
        'enabled': True,
        'play_by_play': {
            'enabled': True,
            'seasons': SEASONS_TO_EXTRACT,
            'columns': [
                # Game identifiers
                'game_id', 'play_id', 'old_game_id',
                'season', 'season_type', 'week', 'game_date',
                'home_team', 'away_team', 'posteam', 'defteam',
                
                # Play information
                'play_type', 'yards_gained', 'ydstogo', 'down',
                'yardline_100', 'quarter_seconds_remaining',
                'half_seconds_remaining', 'game_seconds_remaining',
                'drive', 'qtr', 'desc',
                
                # Player identifiers
                'passer_player_id', 'passer_player_name',
                'receiver_player_id', 'receiver_player_name',
                'rusher_player_id', 'rusher_player_name',
                'kicker_player_id', 'kicker_player_name',
                'fantasy_player_id', 'fantasy_player_name',
                
                # Passing stats
                'pass_attempt', 'complete_pass', 'incomplete_pass',
                'pass_length', 'air_yards', 'yards_after_catch',
                'passing_yards', 'sack', 'interception',
                
                # Rushing stats
                'rush_attempt', 'rushing_yards',
                
                # Touchdown and scoring
                'touchdown', 'pass_touchdown', 'rush_touchdown',
                'receiving_touchdown', 'return_touchdown',
                'two_point_attempt', 'two_point_conv_result',
                'extra_point_attempt', 'extra_point_result',
                'field_goal_attempt', 'field_goal_result',
                
                # Receiving stats
                'reception',
                
                # Penalties and turnovers
                'fumble', 'fumble_lost', 'fumble_recovery_1_player_id',
                'penalty', 'penalty_yards', 'penalty_team',
                
                # Situational flags
                'first_down', 'third_down_converted', 'third_down_failed',
                'fourth_down_converted', 'fourth_down_failed',
                'goal_to_go', 'redzone',
                
                # Fantasy points
                'fantasy_points_ppr'
            ],
            'batch_size': 1000,
            'retry_attempts': 3,
            'retry_delay': 5  # seconds
        },
        'weekly_stats': {
            'enabled': True,
            'seasons': SEASONS_TO_EXTRACT,
            'positions': ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
            'stat_type': 'offense'
        },
        'roster': {
            'enabled': True,
            'seasons': SEASONS_TO_EXTRACT
        }
    },
    'fantasypros': {
        'enabled': False,  # Will be enabled in future phases
        'adp': {
            'enabled': True,
            'formats': ['standard', 'ppr', 'half_ppr'],
            'positions': ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
            'year': MOST_RECENT_SEASON + 1  # ADP is for upcoming season
        },
        'rankings': {
            'enabled': True,
            'formats': ['standard', 'ppr', 'half_ppr'],
            'positions': ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
        }
    },
    'espn': {
        'enabled': False,  # Will be enabled in Phase 5
        'base_url': 'https://fantasy.espn.com/apis/v3/games/ffl',
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }
}

# Extraction settings
EXTRACTION_SETTINGS = {
    'max_retries': 3,
    'retry_delay': 5,  # seconds
    'timeout': 30,  # seconds per request
    'rate_limit': {
        'requests_per_second': 2,
        'burst_size': 5
    },
    'logging': {
        'level': 'INFO',
        'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    },
    'cache': {
        'enabled': True,
        'ttl': 3600,  # 1 hour
        'directory': '/tmp/nfl_cache'
    }
}

# Database settings
DATABASE_SETTINGS = {
    'batch_insert_size': 1000,
    'transaction_size': 10000,
    'vacuum_after_load': True,
    'analyze_after_load': True
}

# Validation settings
VALIDATION_SETTINGS = {
    'check_duplicates': True,
    'check_nulls': True,
    'check_ranges': {
        'yards_gained': (-99, 99),
        'air_yards': (-99, 99),
        'fantasy_points_ppr': (0, 100)
    },
    'required_columns': [
        'game_id', 'play_id', 'season', 'week'
    ]
}

def get_extraction_config() -> Dict[str, Any]:
    """
    Get the complete extraction configuration.
    
    Returns:
        Dictionary with all extraction settings
    """
    return {
        'sources': DATA_SOURCES,
        'settings': EXTRACTION_SETTINGS,
        'database': DATABASE_SETTINGS,
        'validation': VALIDATION_SETTINGS,
        'seasons': SEASONS_TO_EXTRACT
    }

def get_active_sources() -> List[str]:
    """
    Get list of active data sources.
    
    Returns:
        List of enabled data source names
    """
    return [
        source for source, config in DATA_SOURCES.items()
        if config.get('enabled', False)
    ]

def get_seasons_to_extract() -> List[int]:
    """
    Get list of seasons to extract.
    
    Returns:
        List of season years
    """
    return SEASONS_TO_EXTRACT
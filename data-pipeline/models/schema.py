"""
SQLAlchemy-style schema definitions for DuckDB tables
Provides Python models for type safety and data validation
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Dict, Any
from enum import Enum


class GameType(Enum):
    """NFL game type enumeration"""
    PRESEASON = "PRE"
    REGULAR = "REG"
    WILDCARD = "WC"
    DIVISIONAL = "DIV"
    CONFERENCE = "CON"
    SUPERBOWL = "SB"


class Position(Enum):
    """NFL position enumeration"""
    QB = "QB"
    RB = "RB"
    WR = "WR"
    TE = "TE"
    K = "K"
    DST = "DST"
    FLEX = "FLEX"
    SUPERFLEX = "SUPERFLEX"


class ScoringFormat(Enum):
    """Fantasy scoring format enumeration"""
    STANDARD = "standard"
    PPR = "ppr"
    HALF_PPR = "half_ppr"


class SeasonTrend(Enum):
    """Player performance trend enumeration"""
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"


# ============================================
# BRONZE LAYER MODELS
# ============================================

@dataclass
class RawPlay:
    """Bronze layer: Raw play-by-play data"""
    game_id: str
    play_id: int
    season: int
    week: int
    game_date: date
    game_type: Optional[str] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None
    posteam: Optional[str] = None
    defteam: Optional[str] = None
    play_type: Optional[str] = None
    passer_player_id: Optional[str] = None
    passer_player_name: Optional[str] = None
    receiver_player_id: Optional[str] = None
    receiver_player_name: Optional[str] = None
    rusher_player_id: Optional[str] = None
    rusher_player_name: Optional[str] = None
    yards_gained: Optional[float] = None
    air_yards: Optional[float] = None
    yards_after_catch: Optional[float] = None
    complete_pass: Optional[int] = None
    incomplete_pass: Optional[int] = None
    interception: Optional[int] = None
    touchdown: Optional[int] = None
    pass_touchdown: Optional[int] = None
    rush_touchdown: Optional[int] = None
    receiving_touchdown: Optional[int] = None
    fumble: Optional[int] = None
    fumble_lost: Optional[int] = None
    two_point_attempt: Optional[int] = None
    two_point_conv_result: Optional[int] = None
    field_goal_attempt: Optional[int] = None
    field_goal_result: Optional[str] = None
    extra_point_attempt: Optional[int] = None
    extra_point_result: Optional[str] = None
    yardline_100: Optional[int] = None
    ydstogo: Optional[int] = None
    down: Optional[int] = None
    quarter: Optional[int] = None
    time_remaining: Optional[str] = None
    red_zone: Optional[int] = None
    goal_to_go: Optional[int] = None
    raw_data: Optional[Dict[str, Any]] = None
    ingested_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "bronze.raw_plays"


@dataclass
class RawADP:
    """Bronze layer: Raw ADP data"""
    player_id: str
    player_name: str
    team: Optional[str] = None
    position: Optional[str] = None
    adp: Optional[float] = None
    adp_formatted: Optional[str] = None
    times_drafted: Optional[int] = None
    high_pick: Optional[int] = None
    low_pick: Optional[int] = None
    std_dev: Optional[float] = None
    source: Optional[str] = None
    scoring_format: Optional[str] = None
    season: Optional[int] = None
    date_pulled: Optional[date] = None
    ingested_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "bronze.raw_adp"


@dataclass
class RawRoster:
    """Bronze layer: Raw roster data from ESPN"""
    league_id: str
    team_id: str
    player_id: str
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    roster_slot: Optional[str] = None
    acquisition_type: Optional[str] = None
    acquisition_date: Optional[date] = None
    season: Optional[int] = None
    week: Optional[int] = None
    ingested_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "bronze.raw_rosters"


# ============================================
# SILVER LAYER MODELS
# ============================================

@dataclass
class Play:
    """Silver layer: Cleaned play data"""
    play_key: str  # Composite: game_id + play_id
    game_id: str
    play_id: int
    season: int
    week: int
    game_date: Optional[date] = None
    game_type: Optional[str] = None
    team: Optional[str] = None
    opponent: Optional[str] = None
    play_type: Optional[str] = None
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    player_position: Optional[str] = None
    yards_gained: float = 0.0
    air_yards: float = 0.0
    yards_after_catch: float = 0.0
    targets: int = 0
    receptions: int = 0
    passing_yards: float = 0.0
    rushing_yards: float = 0.0
    receiving_yards: float = 0.0
    touchdowns: int = 0
    passing_tds: int = 0
    rushing_tds: int = 0
    receiving_tds: int = 0
    interceptions: int = 0
    fumbles: int = 0
    fumbles_lost: int = 0
    two_point_conversions: int = 0
    red_zone_play: bool = False
    goal_to_go: bool = False
    processed_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "silver.plays"


@dataclass
class PlayerGameStats:
    """Silver layer: Player statistics by game"""
    player_game_key: str  # Composite: player_id + game_id
    player_id: str
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    season: int = 0
    week: int = 0
    game_id: str = ""
    game_date: Optional[date] = None
    opponent: Optional[str] = None
    # Passing stats
    pass_attempts: int = 0
    completions: int = 0
    passing_yards: float = 0.0
    passing_tds: int = 0
    interceptions: int = 0
    sacks: int = 0
    sack_yards: float = 0.0
    # Rushing stats
    carries: int = 0
    rushing_yards: float = 0.0
    rushing_tds: int = 0
    rushing_long: float = 0.0
    # Receiving stats
    targets: int = 0
    receptions: int = 0
    receiving_yards: float = 0.0
    receiving_tds: int = 0
    receiving_long: float = 0.0
    # Fantasy points
    fantasy_points_ppr: float = 0.0
    fantasy_points_standard: float = 0.0
    fantasy_points_half_ppr: float = 0.0
    # Red zone stats
    red_zone_targets: int = 0
    red_zone_carries: int = 0
    red_zone_touches: int = 0
    red_zone_tds: int = 0
    # Snap counts
    snaps: Optional[int] = None
    snap_percentage: Optional[float] = None
    processed_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "silver.player_game_stats"


@dataclass
class PlayerWeekStats:
    """Silver layer: Player weekly aggregates"""
    player_week_key: str  # Composite: player_id + season + week
    player_id: str
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    season: int = 0
    week: int = 0
    games_played: int = 1
    # Aggregate stats
    passing_yards: float = 0.0
    passing_tds: int = 0
    rushing_yards: float = 0.0
    rushing_tds: int = 0
    receiving_yards: float = 0.0
    receiving_tds: int = 0
    targets: int = 0
    receptions: int = 0
    fantasy_points_ppr: float = 0.0
    fantasy_points_standard: float = 0.0
    fantasy_points_half_ppr: float = 0.0
    target_share: Optional[float] = None
    red_zone_share: Optional[float] = None
    processed_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "silver.player_week_stats"


# ============================================
# GOLD LAYER MODELS
# ============================================

@dataclass
class PlayerMetrics:
    """Gold layer: Pre-calculated player metrics"""
    metric_key: str  # Composite: player_id + season + metric_type
    player_id: str
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    season: int = 0
    games_played: Optional[int] = None
    # Consistency metrics
    consistency_score: Optional[float] = None
    floor_score: Optional[float] = None
    ceiling_score: Optional[float] = None
    # Boom/Bust rates
    boom_rate: Optional[float] = None
    bust_rate: Optional[float] = None
    boom_threshold: Optional[float] = None
    bust_threshold: Optional[float] = None
    # Target metrics
    avg_target_share: Optional[float] = None
    avg_targets_per_game: Optional[float] = None
    target_share_consistency: Optional[float] = None
    # Red zone metrics
    red_zone_target_share: Optional[float] = None
    red_zone_touch_share: Optional[float] = None
    red_zone_td_rate: Optional[float] = None
    avg_red_zone_touches: Optional[float] = None
    # Efficiency metrics
    yards_per_target: Optional[float] = None
    yards_per_carry: Optional[float] = None
    td_rate: Optional[float] = None
    catch_rate: Optional[float] = None
    # Fantasy metrics
    avg_fantasy_points_ppr: Optional[float] = None
    avg_fantasy_points_standard: Optional[float] = None
    avg_fantasy_points_half_ppr: Optional[float] = None
    fantasy_points_per_touch: Optional[float] = None
    fantasy_points_per_opportunity: Optional[float] = None
    # Advanced metrics
    air_yards_share: Optional[float] = None
    wopr: Optional[float] = None  # Weighted Opportunity Rating
    racr: Optional[float] = None  # Receiver Air Conversion Ratio
    # Trend metrics
    last_3_avg: Optional[float] = None
    last_5_avg: Optional[float] = None
    season_trend: Optional[str] = None
    calculated_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "gold.player_metrics"


@dataclass
class PlayerRanking:
    """Gold layer: Current player rankings"""
    ranking_key: str  # Composite: player_id + season + week + scoring_format
    player_id: str
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    season: int = 0
    week: int = 0
    scoring_format: str = "ppr"
    # Rankings
    overall_rank: Optional[int] = None
    position_rank: Optional[int] = None
    tier: Optional[int] = None
    # Projections
    projected_points: Optional[float] = None
    projected_ceiling: Optional[float] = None
    projected_floor: Optional[float] = None
    # Value metrics
    value_over_replacement: Optional[float] = None
    adp_value: Optional[float] = None
    # Rest of season
    ros_rank: Optional[int] = None
    ros_projected_points: Optional[float] = None
    # Matchup data
    opponent: Optional[str] = None
    matchup_rating: Optional[float] = None
    opponent_rank_vs_position: Optional[int] = None
    # Confidence
    projection_confidence: Optional[float] = None
    ranking_confidence: Optional[float] = None
    calculated_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "gold.player_rankings"


@dataclass
class PlayerSeasonTotal:
    """Gold layer: Player season totals"""
    season_key: str  # Composite: player_id + season
    player_id: str
    player_name: str
    position: Optional[str] = None
    team: Optional[str] = None
    season: int = 0
    games_played: Optional[int] = None
    # Season totals
    total_passing_yards: Optional[float] = None
    total_passing_tds: Optional[int] = None
    total_rushing_yards: Optional[float] = None
    total_rushing_tds: Optional[int] = None
    total_receiving_yards: Optional[float] = None
    total_receiving_tds: Optional[int] = None
    total_targets: Optional[int] = None
    total_receptions: Optional[int] = None
    total_fantasy_points_ppr: Optional[float] = None
    total_fantasy_points_standard: Optional[float] = None
    # Season ranks
    overall_rank_ppr: Optional[int] = None
    overall_rank_standard: Optional[int] = None
    position_rank_ppr: Optional[int] = None
    position_rank_standard: Optional[int] = None
    calculated_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "gold.player_season_totals"


@dataclass
class MatchupHistory:
    """Gold layer: Matchup history and trends"""
    matchup_key: str  # Composite: team + opponent + season
    team: str
    opponent: str
    season: int = 0
    position: Optional[str] = None
    # Defensive metrics
    avg_points_allowed: Optional[float] = None
    avg_yards_allowed: Optional[float] = None
    avg_tds_allowed: Optional[float] = None
    fantasy_points_allowed_rank: Optional[int] = None
    # Trend data
    last_4_weeks_avg: Optional[float] = None
    season_trend: Optional[str] = None
    home_away_split: Optional[float] = None
    calculated_at: datetime = field(default_factory=datetime.now)
    
    @property
    def table_name(self) -> str:
        return "gold.matchup_history"


# ============================================
# HELPER FUNCTIONS
# ============================================

def model_to_dict(model_instance) -> Dict[str, Any]:
    """Convert a dataclass model to a dictionary for database insertion."""
    result = {}
    for field_name in model_instance.__dataclass_fields__:
        value = getattr(model_instance, field_name)
        # Convert enums to their values
        if isinstance(value, Enum):
            value = value.value
        # Convert datetime/date to string
        elif isinstance(value, (datetime, date)):
            value = value.isoformat()
        result[field_name] = value
    return result


def dict_to_model(data_dict: Dict[str, Any], model_class):
    """Convert a dictionary to a dataclass model instance."""
    # Filter only the fields that exist in the model
    model_fields = model_class.__dataclass_fields__.keys()
    filtered_dict = {k: v for k, v in data_dict.items() if k in model_fields}
    return model_class(**filtered_dict)
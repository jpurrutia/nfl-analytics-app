#!/usr/bin/env python3
"""
Integration test for analytics calculations with sample NFL data
Tests the complete flow from data extraction to metrics calculation
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from analytics.consistency import ConsistencyCalculator
from analytics.boom_bust import BoomBustCalculator
from analytics.target_share import TargetShareCalculator
from analytics.red_zone import RedZoneCalculator
from analytics.matchup_strength import MatchupStrengthCalculator


def create_sample_player_data():
    """Create sample player data for testing."""
    # Sample weekly data for a WR
    data = {
        'player_id': ['player1'] * 10,
        'player_name': ['Test Player'] * 10,
        'position': ['WR'] * 10,
        'team': ['KC'] * 10,
        'week': list(range(1, 11)),
        'season': [2023] * 10,
        'opponent': ['DEN', 'JAX', 'CHI', 'NYJ', 'MIN', 
                    'BUF', 'DEN', 'MIA', 'CIN', 'LV'],
        'fantasy_points_ppr': [22.5, 8.3, 15.7, 28.9, 12.1,
                               19.8, 31.2, 14.5, 10.2, 25.6],
        'targets': [8, 4, 7, 11, 6, 9, 12, 6, 5, 10],
        'receptions': [6, 2, 5, 9, 4, 7, 10, 4, 3, 8],
        'receiving_yards': [95, 28, 67, 142, 51, 88, 156, 62, 38, 119],
        'receiving_touchdowns': [1, 0, 0, 2, 0, 1, 2, 0, 0, 1],
        'air_yards': [120, 45, 88, 165, 72, 110, 195, 78, 52, 145],
        'yards_after_catch': [25, 8, 17, 37, 11, 28, 41, 14, 8, 31],
        'yardline_100': [50, 75, 18, 25, 60, 12, 8, 35, 80, 15]  # Field position
    }
    
    return pd.DataFrame(data)


def test_consistency_calculator():
    """Test consistency calculations."""
    print("\n=== Testing Consistency Calculator ===")
    
    calc = ConsistencyCalculator()
    df = create_sample_player_data()
    
    # Test consistency score
    consistency_score = calc.calculate_consistency_score(
        df['fantasy_points_ppr'], method='cv'
    )
    print(f"Consistency Score (CV): {consistency_score:.2f}")
    assert 0 <= consistency_score <= 100, "Consistency score should be 0-100"
    
    # Test floor/ceiling
    metrics = calc.calculate_floor_ceiling(df['fantasy_points_ppr'])
    print(f"Floor: {metrics['floor']:.2f}, Ceiling: {metrics['ceiling']:.2f}")
    assert metrics['floor'] < metrics['ceiling'], "Floor should be less than ceiling"
    
    # Test trend analysis
    trend = calc.calculate_trend(df['fantasy_points_ppr'])
    print(f"Trend: {trend['trend']}, Recent Form: {trend['recent_form']}")
    
    # Test all metrics
    all_metrics = calc.calculate_all_metrics(df)
    print(f"Games Played: {all_metrics['games_played']}")
    print(f"Average Points: {all_metrics['average_points']:.2f}")
    
    print("✓ Consistency calculator tests passed")


def test_boom_bust_calculator():
    """Test boom/bust calculations."""
    print("\n=== Testing Boom/Bust Calculator ===")
    
    calc = BoomBustCalculator(scoring_format='ppr')
    df = create_sample_player_data()
    
    # Test boom/bust rates
    results = calc.calculate_boom_bust_rates(
        df['fantasy_points_ppr'], position='WR'
    )
    print(f"Boom Rate: {results['boom_rate']:.1f}%")
    print(f"Bust Rate: {results['bust_rate']:.1f}%")
    print(f"Boom Games: {results['boom_games']}/{results['games_played']}")
    
    # Test volatility index
    volatility = calc.calculate_volatility_index(df['fantasy_points_ppr'], 'WR')
    print(f"Volatility Index: {volatility:.2f}")
    assert 0 <= volatility <= 100, "Volatility should be 0-100"
    
    # Test elite/dud rates
    elite_dud = calc.calculate_elite_dud_rates(df['fantasy_points_ppr'], 'WR')
    print(f"Elite Rate: {elite_dud['elite_rate']:.1f}%")
    print(f"Dud Rate: {elite_dud['dud_rate']:.1f}%")
    
    print("✓ Boom/bust calculator tests passed")


def test_target_share_calculator():
    """Test target share calculations."""
    print("\n=== Testing Target Share Calculator ===")
    
    calc = TargetShareCalculator()
    
    # Add team totals to our sample data
    df = create_sample_player_data()
    df['team_targets'] = [35, 28, 32, 38, 30, 36, 40, 31, 29, 37]
    df['team_air_yards'] = [420, 350, 380, 450, 360, 410, 480, 370, 340, 440]
    df['team_yac'] = [120, 85, 95, 140, 88, 115, 155, 92, 82, 130]
    
    # Test individual calculations
    target_share = calc.calculate_target_share(8, 35)  # 8 targets, 35 team targets
    print(f"Target Share: {target_share:.1f}%")
    
    # Test WOPR
    air_yards_share = calc.calculate_air_yards_share(120, 420)
    wopr = calc.calculate_wopr(target_share, air_yards_share)
    print(f"WOPR: {wopr:.3f}")
    assert 0 <= wopr <= 1, "WOPR should be 0-1"
    
    # Test RACR
    racr = calc.calculate_racr(95, 120)
    print(f"RACR: {racr:.3f}")
    
    # Test opportunity metrics (skip since it needs team totals aggregation)
    print("Opportunity metrics calculation: Skipped (requires team aggregation)")
    
    print("✓ Target share calculator tests passed")


def test_red_zone_calculator():
    """Test red zone calculations."""
    print("\n=== Testing Red Zone Calculator ===")
    
    calc = RedZoneCalculator()
    df = create_sample_player_data()
    
    # Test red zone identification
    is_rz = calc.is_red_zone_play(18)  # 18 yards from end zone
    assert is_rz == True, "18 yards should be red zone"
    
    is_gl = calc.is_goal_line_play(3)  # 3 yards from end zone
    assert is_gl == True, "3 yards should be goal line"
    
    # Test efficiency calculation
    efficiency = calc.calculate_red_zone_efficiency(2, 5)  # 2 TDs, 5 opportunities
    print(f"Red Zone Efficiency: {efficiency:.1f}%")
    assert efficiency == 40.0, "2/5 should be 40%"
    
    # Count red zone plays in sample data
    rz_plays = df[df['yardline_100'] <= 20]
    print(f"Red Zone Plays: {len(rz_plays)}/{len(df)}")
    
    # Test player metrics
    metrics = calc.calculate_player_red_zone_metrics(df, 'player1')
    print(f"Red Zone Targets: {metrics.get('red_zone_targets', 0)}")
    
    print("✓ Red zone calculator tests passed")


def test_matchup_strength_calculator():
    """Test matchup strength calculations."""
    print("\n=== Testing Matchup Strength Calculator ===")
    
    calc = MatchupStrengthCalculator()
    df = create_sample_player_data()
    
    # Create sample data with multiple players for defense analysis
    multi_df = pd.concat([
        df,
        df.copy().assign(player_id='player2', player_name='Player 2'),
        df.copy().assign(player_id='player3', player_name='Player 3', position='RB')
    ])
    
    # Test defense vs position
    defense_metrics = calc.calculate_defense_vs_position(
        multi_df, 'DEN', 'WR', 'ppr'
    )
    print(f"DEN vs WR - Games: {defense_metrics['games']}")
    if defense_metrics['games'] > 0:
        print(f"Points Allowed Avg: {defense_metrics['points_allowed_avg']:.2f}")
    
    # Test matchup categorization
    rating = calc._categorize_matchup(15.0)  # 15% above average
    print(f"Matchup Rating (15% above avg): {rating}")
    assert rating == "Good Matchup", "15% above should be Good Matchup"
    
    # Test pace metrics (skip - requires play-by-play data)
    print("Pace metrics: Skipped (requires play-by-play data)")
    
    print("✓ Matchup strength calculator tests passed")


def test_integration_flow():
    """Test the complete analytics flow."""
    print("\n=== Testing Complete Integration Flow ===")
    
    df = create_sample_player_data()
    
    # 1. Calculate consistency
    consistency_calc = ConsistencyCalculator()
    consistency_metrics = consistency_calc.calculate_all_metrics(df)
    
    # 2. Calculate boom/bust
    boom_calc = BoomBustCalculator('ppr')
    boom_metrics = boom_calc.calculate_all_metrics(df)
    
    # 3. Combine metrics
    combined = {
        'player_id': df['player_id'].iloc[0],
        'player_name': df['player_name'].iloc[0],
        'position': df['position'].iloc[0],
        'consistency_score': consistency_metrics['consistency_score'],
        'boom_rate': boom_metrics['boom_rate'],
        'bust_rate': boom_metrics['bust_rate'],
        'floor': consistency_metrics['floor'],
        'ceiling': consistency_metrics['ceiling'],
        'volatility': boom_metrics['volatility_index'],
        'avg_points': consistency_metrics['average_points']
    }
    
    print("\n=== Player Analytics Summary ===")
    for key, value in combined.items():
        if isinstance(value, (int, float)):
            print(f"{key}: {value:.2f}")
        else:
            print(f"{key}: {value}")
    
    # Validate combined metrics
    assert combined['floor'] < combined['ceiling'], "Floor should be less than ceiling"
    assert 0 <= combined['consistency_score'] <= 100, "Invalid consistency score"
    assert 0 <= combined['boom_rate'] <= 100, "Invalid boom rate"
    
    print("\n✓ Integration flow tests passed")


def main():
    """Run all integration tests."""
    print("=" * 50)
    print("Running Analytics Integration Tests")
    print("=" * 50)
    
    try:
        test_consistency_calculator()
        test_boom_bust_calculator()
        test_target_share_calculator()
        test_red_zone_calculator()
        test_matchup_strength_calculator()
        test_integration_flow()
        
        print("\n" + "=" * 50)
        print("✅ ALL INTEGRATION TESTS PASSED")
        print("=" * 50)
        return 0
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
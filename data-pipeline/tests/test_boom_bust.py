"""
Tests for Boom/Bust Rate Calculator
Following TDD principles - these tests verify boom/bust calculations
"""

import unittest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from analytics.boom_bust import BoomBustCalculator


class TestBoomBustCalculator(unittest.TestCase):
    """Test suite for boom/bust rate calculations."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.calculator = BoomBustCalculator(scoring_format='ppr')
        
        # Create sample data with known boom/bust games
        self.wr_points = pd.Series([
            25.0,  # Boom (>20 for WR in PPR)
            8.0,   # Bust (<10 for WR in PPR)
            15.0,  # Normal
            22.0,  # Boom
            9.0,   # Bust
            18.0,  # Normal
            30.0,  # Boom
            5.0,   # Bust
        ])
        
        self.rb_points = pd.Series([
            22.0,  # Boom (>20 for RB in PPR)
            9.0,   # Bust (<10 for RB in PPR)
            15.0,  # Normal
            25.0,  # Boom
            8.0,   # Bust
            18.0,  # Normal
            28.0,  # Boom
            7.0,   # Bust
        ])
    
    def test_threshold_retrieval(self):
        """Test getting boom/bust thresholds for different positions."""
        wr_boom, wr_bust = self.calculator.get_thresholds('WR')
        self.assertEqual(wr_boom, 20)  # PPR WR boom threshold
        self.assertEqual(wr_bust, 10)  # PPR WR bust threshold
        
        rb_boom, rb_bust = self.calculator.get_thresholds('RB')
        self.assertEqual(rb_boom, 20)  # PPR RB boom threshold
        self.assertEqual(rb_bust, 10)  # PPR RB bust threshold
        
        qb_boom, qb_bust = self.calculator.get_thresholds('QB')
        self.assertEqual(qb_boom, 22)  # QB boom threshold
        self.assertEqual(qb_bust, 12)  # QB bust threshold
    
    def test_boom_bust_rate_calculation(self):
        """Test boom and bust rate calculations."""
        results = self.calculator.calculate_boom_bust_rates(
            self.wr_points,
            position='WR'
        )
        
        self.assertIn('boom_rate', results)
        self.assertIn('bust_rate', results)
        self.assertIn('boom_games', results)
        self.assertIn('bust_games', results)
        self.assertIn('games_played', results)
        
        # Verify counts
        self.assertEqual(results['games_played'], 8)
        self.assertEqual(results['boom_games'], 3)  # 25, 22, 30
        self.assertEqual(results['bust_games'], 3)  # 8, 9, 5
        
        # Verify rates
        self.assertAlmostEqual(results['boom_rate'], 37.5, places=1)  # 3/8 * 100
        self.assertAlmostEqual(results['bust_rate'], 37.5, places=1)  # 3/8 * 100
    
    def test_custom_thresholds(self):
        """Test using custom boom/bust thresholds."""
        results = self.calculator.calculate_boom_bust_rates(
            self.wr_points,
            boom_threshold=15.0,
            bust_threshold=12.0
        )
        
        # With lower thresholds, more games should be booms
        self.assertGreater(results['boom_games'], 3)
        self.assertEqual(results['boom_threshold'], 15.0)
        self.assertEqual(results['bust_threshold'], 12.0)
    
    def test_percentile_boom_bust(self):
        """Test percentile-based boom/bust calculation."""
        results = self.calculator.calculate_percentile_boom_bust(
            self.wr_points,
            boom_percentile=75,
            bust_percentile=25
        )
        
        self.assertIn('percentile_boom_rate', results)
        self.assertIn('percentile_bust_rate', results)
        self.assertIn('percentile_boom_threshold', results)
        self.assertIn('percentile_bust_threshold', results)
        
        # Rates should be around 25% each for 75th/25th percentiles
        self.assertGreater(results['percentile_boom_rate'], 20)
        self.assertLess(results['percentile_boom_rate'], 30)
    
    def test_elite_dud_rates(self):
        """Test elite and dud game calculations."""
        results = self.calculator.calculate_elite_dud_rates(
            self.wr_points,
            position='WR'
        )
        
        self.assertIn('elite_rate', results)
        self.assertIn('dud_rate', results)
        self.assertIn('elite_threshold', results)
        self.assertIn('dud_threshold', results)
        
        # Elite threshold should be 50% higher than boom
        self.assertEqual(results['elite_threshold'], 30.0)  # 20 * 1.5
        # Dud threshold should be 50% lower than bust
        self.assertEqual(results['dud_threshold'], 5.0)  # 10 * 0.5
        
        # Should have 1 elite game (30.0) and 1 dud game (5.0)
        self.assertEqual(results['elite_games'], 1)
        self.assertEqual(results['dud_games'], 1)
    
    def test_volatility_index(self):
        """Test volatility index calculation."""
        # Consistent player
        consistent = pd.Series([15.0] * 8)
        consistent_vol = self.calculator.calculate_volatility_index(consistent, 'WR')
        
        # Volatile player
        volatile = pd.Series([5.0, 30.0] * 4)
        volatile_vol = self.calculator.calculate_volatility_index(volatile, 'WR')
        
        self.assertLess(consistent_vol, 20)  # Very consistent
        self.assertGreater(volatile_vol, 50)  # Very volatile
        self.assertLessEqual(volatile_vol, 100)  # Capped at 100
    
    def test_all_metrics_calculation(self):
        """Test calculation of all boom/bust metrics."""
        player_df = pd.DataFrame({
            'player_id': ['player1'] * 8,
            'position': ['WR'] * 8,
            'fantasy_points_ppr': self.wr_points.values
        })
        
        metrics = self.calculator.calculate_all_metrics(player_df)
        
        expected_keys = [
            'boom_rate', 'bust_rate', 'boom_games', 'bust_games',
            'percentile_boom_rate', 'percentile_bust_rate',
            'elite_rate', 'dud_rate', 'volatility_index'
        ]
        
        for key in expected_keys:
            self.assertIn(key, metrics)
    
    def test_multiple_players(self):
        """Test calculation for multiple players."""
        df = pd.DataFrame({
            'player_id': ['p1'] * 5 + ['p2'] * 5,
            'player_name': ['Consistent'] * 5 + ['Volatile'] * 5,
            'position': ['WR'] * 10,
            'fantasy_points_ppr': [15, 16, 14, 15, 16, 5, 30, 8, 35, 10],
            'season': [2023] * 10
        })
        
        results = self.calculator.calculate_for_multiple_players(df, season=2023)
        
        self.assertEqual(len(results), 2)
        
        # Volatile player should have higher boom/bust rates
        p1 = results[results['player_id'] == 'p1'].iloc[0]
        p2 = results[results['player_id'] == 'p2'].iloc[0]
        
        self.assertLess(p1['boom_rate'], p2['boom_rate'])
        self.assertLess(p1['bust_rate'], p2['bust_rate'])
        self.assertLess(p1['volatility_index'], p2['volatility_index'])
    
    def test_player_categorization(self):
        """Test categorizing players based on boom/bust profile."""
        metrics_df = pd.DataFrame({
            'player_id': ['elite', 'upside', 'floor', 'avoid', 'volatile'],
            'boom_rate': [45.0, 32.0, 18.0, 10.0, 35.0],
            'bust_rate': [15.0, 22.0, 18.0, 45.0, 40.0],
            'volatility_index': [40.0, 45.0, 25.0, 60.0, 75.0]
        })
        
        categorized = self.calculator.categorize_players(metrics_df)
        
        self.assertIn('player_category', categorized.columns)
        self.assertIn('risk_level', categorized.columns)
        
        # Check categorizations
        elite = categorized[categorized['player_id'] == 'elite'].iloc[0]
        self.assertEqual(elite['player_category'], 'Elite Ceiling')
        
        floor = categorized[categorized['player_id'] == 'floor'].iloc[0]
        self.assertEqual(floor['player_category'], 'Consistent Floor')
        
        volatile = categorized[categorized['player_id'] == 'volatile'].iloc[0]
        self.assertEqual(volatile['risk_level'], 'High Risk')
    
    def test_scoring_format_differences(self):
        """Test different scoring formats have different thresholds."""
        standard_calc = BoomBustCalculator(scoring_format='standard')
        ppr_calc = BoomBustCalculator(scoring_format='ppr')
        half_ppr_calc = BoomBustCalculator(scoring_format='half_ppr')
        
        # RB thresholds should differ
        std_boom, std_bust = standard_calc.get_thresholds('RB')
        ppr_boom, ppr_bust = ppr_calc.get_thresholds('RB')
        half_boom, half_bust = half_ppr_calc.get_thresholds('RB')
        
        self.assertLess(std_boom, ppr_boom)  # PPR should have higher thresholds
        self.assertLess(std_bust, ppr_bust)
        self.assertEqual(half_boom, 19)  # Half-PPR in between
    
    def test_empty_data_handling(self):
        """Test handling of empty or invalid data."""
        empty_series = pd.Series([])
        results = self.calculator.calculate_boom_bust_rates(empty_series)
        
        self.assertEqual(results['boom_rate'], 0.0)
        self.assertEqual(results['bust_rate'], 0.0)
        self.assertEqual(results['games_played'], 0)
        
        # Test with NaN values
        nan_series = pd.Series([10.0, np.nan, 15.0, np.nan, 20.0])
        results = self.calculator.calculate_boom_bust_rates(nan_series, position='WR')
        
        self.assertEqual(results['games_played'], 3)  # Only non-NaN values
    
    def test_edge_cases(self):
        """Test edge cases."""
        # All boom games
        all_boom = pd.Series([25.0, 30.0, 28.0, 35.0])
        results = self.calculator.calculate_boom_bust_rates(all_boom, position='WR')
        self.assertEqual(results['boom_rate'], 100.0)
        self.assertEqual(results['bust_rate'], 0.0)
        
        # All bust games
        all_bust = pd.Series([5.0, 6.0, 4.0, 7.0])
        results = self.calculator.calculate_boom_bust_rates(all_bust, position='WR')
        self.assertEqual(results['boom_rate'], 0.0)
        self.assertEqual(results['bust_rate'], 100.0)


if __name__ == '__main__':
    unittest.main()
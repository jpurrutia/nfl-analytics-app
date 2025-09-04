"""
Tests for Consistency Score Calculator
Following TDD principles - these tests verify the consistency calculations
"""

import unittest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from analytics.consistency import ConsistencyCalculator


class TestConsistencyCalculator(unittest.TestCase):
    """Test suite for consistency score calculations."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.calculator = ConsistencyCalculator(min_games=3)
        
        # Create sample data
        self.sample_points = pd.Series([15.2, 12.8, 18.5, 14.1, 16.3, 11.9, 17.2, 15.8])
        self.consistent_points = pd.Series([15.0, 14.5, 15.5, 14.8, 15.2, 14.9, 15.1, 15.3])
        self.volatile_points = pd.Series([5.0, 25.0, 8.0, 30.0, 3.0, 28.0, 6.0, 32.0])
        
    def test_consistency_score_cv_method(self):
        """Test consistency score calculation using coefficient of variation."""
        score = self.calculator.calculate_consistency_score(self.sample_points, method='cv')
        
        # Score should be between 0 and 100
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
        
        # Consistent data should have higher score
        consistent_score = self.calculator.calculate_consistency_score(self.consistent_points, method='cv')
        volatile_score = self.calculator.calculate_consistency_score(self.volatile_points, method='cv')
        
        self.assertGreater(consistent_score, volatile_score)
        self.assertGreater(consistent_score, 80)  # Very consistent should be > 80
        self.assertLess(volatile_score, 50)  # Very volatile should be < 50
    
    def test_consistency_score_modified_cv(self):
        """Test modified CV method that accounts for floor performance."""
        score = self.calculator.calculate_consistency_score(self.sample_points, method='modified_cv')
        
        self.assertIsNotNone(score)
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
    
    def test_consistency_score_percentile_method(self):
        """Test percentile range consistency calculation."""
        score = self.calculator.calculate_consistency_score(self.sample_points, method='percentile')
        
        self.assertIsNotNone(score)
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
    
    def test_insufficient_games(self):
        """Test handling of insufficient game data."""
        short_series = pd.Series([10.0, 12.0])  # Only 2 games
        score = self.calculator.calculate_consistency_score(short_series)
        
        self.assertTrue(np.isnan(score))
    
    def test_floor_ceiling_calculation(self):
        """Test floor and ceiling calculations."""
        metrics = self.calculator.calculate_floor_ceiling(self.sample_points)
        
        self.assertIn('floor', metrics)
        self.assertIn('ceiling', metrics)
        self.assertIn('median', metrics)
        
        # Floor should be less than ceiling
        self.assertLess(metrics['floor'], metrics['ceiling'])
        # Median should be between floor and ceiling
        self.assertGreater(metrics['median'], metrics['floor'])
        self.assertLess(metrics['median'], metrics['ceiling'])
    
    def test_week_to_week_variance(self):
        """Test week-to-week variance calculation."""
        variance = self.calculator.calculate_week_to_week_variance(self.sample_points)
        
        self.assertIsNotNone(variance)
        self.assertGreaterEqual(variance, 0)
        
        # Consistent data should have lower variance
        consistent_var = self.calculator.calculate_week_to_week_variance(self.consistent_points)
        volatile_var = self.calculator.calculate_week_to_week_variance(self.volatile_points)
        
        self.assertLess(consistent_var, volatile_var)
    
    def test_trend_calculation(self):
        """Test trend analysis."""
        # Create trending data
        improving = pd.Series([10.0, 11.0, 12.0, 14.0, 15.0, 17.0, 18.0, 20.0])
        declining = pd.Series([20.0, 18.0, 17.0, 15.0, 14.0, 12.0, 11.0, 10.0])
        stable = pd.Series([15.0, 14.8, 15.2, 14.9, 15.1, 15.0, 14.9, 15.1])
        
        improving_trend = self.calculator.calculate_trend(improving)
        declining_trend = self.calculator.calculate_trend(declining)
        stable_trend = self.calculator.calculate_trend(stable)
        
        self.assertEqual(improving_trend['trend'], 'improving')
        self.assertEqual(declining_trend['trend'], 'declining')
        self.assertEqual(stable_trend['trend'], 'stable')
        
        # Check recent form
        self.assertIn('recent_form', improving_trend)
        self.assertEqual(improving_trend['recent_form'], 'hot')
    
    def test_all_metrics_calculation(self):
        """Test calculation of all metrics for a player."""
        player_df = pd.DataFrame({
            'player_id': ['player1'] * 8,
            'player_name': ['Test Player'] * 8,
            'position': ['WR'] * 8,
            'week': range(1, 9),
            'fantasy_points_ppr': self.sample_points.values
        })
        
        metrics = self.calculator.calculate_all_metrics(player_df)
        
        # Check all expected metrics are present
        expected_keys = [
            'games_played', 'consistency_score', 'consistency_score_modified',
            'consistency_score_percentile', 'week_to_week_variance',
            'floor', 'ceiling', 'median', 'trend', 'recent_form',
            'average_points', 'total_points'
        ]
        
        for key in expected_keys:
            self.assertIn(key, metrics)
    
    def test_multiple_players_calculation(self):
        """Test calculation for multiple players."""
        df = pd.DataFrame({
            'player_id': ['p1'] * 5 + ['p2'] * 5,
            'player_name': ['Player 1'] * 5 + ['Player 2'] * 5,
            'position': ['RB'] * 5 + ['WR'] * 5,
            'week': list(range(1, 6)) * 2,
            'fantasy_points_ppr': [12, 14, 13, 15, 11, 20, 8, 25, 10, 22],
            'season': [2023] * 10
        })
        
        results = self.calculator.calculate_for_multiple_players(df, season=2023)
        
        self.assertEqual(len(results), 2)
        self.assertIn('consistency_score', results.columns)
        self.assertIn('player_name', results.columns)
        
        # Player 1 should be more consistent than Player 2
        p1_score = results[results['player_id'] == 'p1']['consistency_score'].iloc[0]
        p2_score = results[results['player_id'] == 'p2']['consistency_score'].iloc[0]
        self.assertGreater(p1_score, p2_score)
    
    def test_consistency_ranking(self):
        """Test ranking players by consistency."""
        metrics_df = pd.DataFrame({
            'player_id': ['p1', 'p2', 'p3'],
            'consistency_score': [85.0, 70.0, 60.0],
            'average_points': [15.0, 20.0, 12.0],
            'floor': [12.0, 10.0, 5.0],
            'position': ['WR', 'WR', 'RB']
        })
        
        ranked = self.calculator.rank_by_consistency(metrics_df)
        
        self.assertIn('consistency_rating', ranked.columns)
        self.assertIn('consistency_rank_overall', ranked.columns)
        self.assertIn('consistency_rank_position', ranked.columns)
        
        # Check ranking is correct
        self.assertEqual(ranked.iloc[0]['player_id'], 'p1')  # Highest rating
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        # Empty series
        empty_series = pd.Series([])
        score = self.calculator.calculate_consistency_score(empty_series)
        self.assertTrue(np.isnan(score))
        
        # All zeros
        zero_series = pd.Series([0.0] * 5)
        score = self.calculator.calculate_consistency_score(zero_series)
        self.assertEqual(score, 0.0)
        
        # Single value repeated
        same_series = pd.Series([10.0] * 8)
        score = self.calculator.calculate_consistency_score(same_series)
        self.assertEqual(score, 100.0)  # Perfect consistency
        
        # Negative values (shouldn't happen but handle gracefully)
        negative_series = pd.Series([-5.0, 10.0, 15.0, 8.0, 12.0])
        score = self.calculator.calculate_consistency_score(negative_series)
        self.assertIsNotNone(score)


if __name__ == '__main__':
    unittest.main()
"""
Tests for DuckDB database setup and connection management
"""

import os
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, date
import pandas as pd

import sys
sys.path.append(str(Path(__file__).parent.parent))

from database.connection import DuckDBConnectionManager, get_db_manager
from models.schema import (
    RawPlay, RawADP, PlayerGameStats, PlayerMetrics,
    model_to_dict, dict_to_model
)


class TestDuckDBConnection(unittest.TestCase):
    """Test DuckDB connection management"""
    
    def setUp(self):
        """Set up test database"""
        # Create temporary database path (but don't create the file)
        temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(temp_dir, 'test_analytics.db')
        
        # Create connection manager
        self.db_manager = DuckDBConnectionManager(self.db_path)
    
    def tearDown(self):
        """Clean up test database"""
        self.db_manager.close_all_connections()
        # Remove temporary directory
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)
        temp_dir = os.path.dirname(self.db_path)
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
    
    def test_connection_creation(self):
        """Test database connection creation"""
        with self.db_manager.get_connection() as conn:
            self.assertIsNotNone(conn)
            # Test simple query
            result = conn.execute("SELECT 1 as test").fetchone()
            self.assertEqual(result[0], 1)
    
    def test_schema_initialization(self):
        """Test that schemas are created on initialization"""
        # Check if schemas exist
        result = self.db_manager.execute_query("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name IN ('bronze', 'silver', 'gold')
            ORDER BY schema_name
        """)
        
        schema_names = [row[0] for row in result]
        self.assertIn('bronze', schema_names)
        self.assertIn('silver', schema_names)
        self.assertIn('gold', schema_names)
    
    def test_table_creation(self):
        """Test that tables are created correctly"""
        # Check bronze tables
        bronze_tables = ['raw_plays', 'raw_adp', 'raw_rosters']
        for table in bronze_tables:
            self.assertTrue(
                self.db_manager.table_exists(table, 'bronze'),
                f"Table bronze.{table} should exist"
            )
        
        # Check silver tables
        silver_tables = ['plays', 'player_game_stats', 'player_week_stats']
        for table in silver_tables:
            self.assertTrue(
                self.db_manager.table_exists(table, 'silver'),
                f"Table silver.{table} should exist"
            )
        
        # Check gold tables
        gold_tables = ['player_metrics', 'player_rankings', 'player_season_totals', 'matchup_history']
        for table in gold_tables:
            self.assertTrue(
                self.db_manager.table_exists(table, 'gold'),
                f"Table gold.{table} should exist"
            )
    
    def test_insert_and_query_dataframe(self):
        """Test inserting and querying data using DataFrames"""
        # Create sample data
        data = {
            'player_id': ['P001', 'P002', 'P003'],
            'player_name': ['Player One', 'Player Two', 'Player Three'],
            'team': ['KC', 'BUF', 'MIA'],
            'position': ['QB', 'RB', 'WR'],
            'adp': [1.5, 15.3, 25.7],
            'season': [2024, 2024, 2024]
        }
        df = pd.DataFrame(data)
        
        # Insert data
        self.db_manager.insert_dataframe(df, 'raw_adp', 'bronze')
        
        # Query data back
        result_df = self.db_manager.execute_query_df(
            "SELECT player_id, player_name, adp FROM bronze.raw_adp ORDER BY adp"
        )
        
        self.assertEqual(len(result_df), 3)
        self.assertEqual(result_df.iloc[0]['player_id'], 'P001')
        self.assertEqual(result_df.iloc[0]['adp'], 1.5)
    
    def test_bulk_insert(self):
        """Test bulk insert functionality"""
        # Create sample data as list of dicts
        data = [
            {'player_id': 'P004', 'player_name': 'Player Four', 'team': 'DAL', 'position': 'TE', 'adp': 45.2, 'season': 2024},
            {'player_id': 'P005', 'player_name': 'Player Five', 'team': 'GB', 'position': 'WR', 'adp': 55.8, 'season': 2024},
        ]
        
        # Bulk insert
        self.db_manager.bulk_insert(data, 'raw_adp', 'bronze')
        
        # Verify insertion
        result = self.db_manager.execute_query(
            "SELECT COUNT(*) FROM bronze.raw_adp WHERE player_id IN ('P004', 'P005')"
        )
        self.assertEqual(result[0][0], 2)
    
    def test_get_table_info(self):
        """Test getting table column information"""
        info = self.db_manager.get_table_info('player_metrics', 'gold')
        
        # Check that we have columns
        self.assertGreater(len(info), 0)
        
        # Check specific columns exist
        column_names = info['column_name'].tolist()
        self.assertIn('player_id', column_names)
        self.assertIn('consistency_score', column_names)
        self.assertIn('boom_rate', column_names)
    
    def test_get_table_stats(self):
        """Test getting table statistics"""
        # Insert some test data first
        data = {
            'player_id': ['P001'],
            'player_name': ['Test Player'],
            'season': [2024]
        }
        df = pd.DataFrame(data)
        self.db_manager.insert_dataframe(df, 'raw_adp', 'bronze')
        
        # Get stats
        stats = self.db_manager.get_table_stats('raw_adp', 'bronze')
        
        self.assertIn('row_count', stats)
        self.assertIn('schema', stats)
        self.assertEqual(stats['schema'], 'bronze')
        self.assertEqual(stats['table'], 'raw_adp')
        self.assertGreaterEqual(stats['row_count'], 1)


class TestSchemaModels(unittest.TestCase):
    """Test schema model classes"""
    
    def test_raw_play_model(self):
        """Test RawPlay model creation and conversion"""
        play = RawPlay(
            game_id='2024_01_KC_BUF',
            play_id=1,
            season=2024,
            week=1,
            game_date=date(2024, 9, 8),
            passer_player_name='Patrick Mahomes',
            yards_gained=25.0,
            touchdown=1
        )
        
        self.assertEqual(play.game_id, '2024_01_KC_BUF')
        self.assertEqual(play.table_name, 'bronze.raw_plays')
        
        # Test conversion to dict
        play_dict = model_to_dict(play)
        self.assertIn('game_id', play_dict)
        self.assertEqual(play_dict['yards_gained'], 25.0)
    
    def test_player_metrics_model(self):
        """Test PlayerMetrics model"""
        metrics = PlayerMetrics(
            metric_key='P001_2024_ppr',
            player_id='P001',
            player_name='Test Player',
            season=2024,
            consistency_score=8.5,
            boom_rate=0.35,
            bust_rate=0.15
        )
        
        self.assertEqual(metrics.player_id, 'P001')
        self.assertEqual(metrics.table_name, 'gold.player_metrics')
        self.assertEqual(metrics.boom_rate, 0.35)
    
    def test_model_dict_conversion(self):
        """Test converting between model and dictionary"""
        # Create model
        original = PlayerGameStats(
            player_game_key='P001_2024_01_KC_BUF',
            player_id='P001',
            player_name='Test Player',
            season=2024,
            week=1,
            game_id='2024_01_KC_BUF',
            passing_yards=325.5,
            passing_tds=3
        )
        
        # Convert to dict
        data_dict = model_to_dict(original)
        
        # Convert back to model
        restored = dict_to_model(data_dict, PlayerGameStats)
        
        self.assertEqual(original.player_id, restored.player_id)
        self.assertEqual(original.passing_yards, restored.passing_yards)
        self.assertEqual(original.passing_tds, restored.passing_tds)


class TestDatabaseIntegration(unittest.TestCase):
    """Integration tests for the full database setup"""
    
    def setUp(self):
        """Set up test database"""
        # Create temporary database path (but don't create the file)
        temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(temp_dir, 'test_analytics.db')
        self.db_manager = DuckDBConnectionManager(self.db_path)
    
    def tearDown(self):
        """Clean up test database"""
        self.db_manager.close_all_connections()
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)
        temp_dir = os.path.dirname(self.db_path)
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
    
    def test_medallion_architecture_flow(self):
        """Test data flow through bronze -> silver -> gold layers"""
        # 1. Insert raw play data into bronze
        bronze_data = {
            'game_id': ['2024_01_KC_BUF'],
            'play_id': [100],
            'season': [2024],
            'week': [1],
            'game_date': [date(2024, 9, 8)],
            'passer_player_id': ['P_Mahomes'],
            'passer_player_name': ['Patrick Mahomes'],
            'yards_gained': [25.0],
            'pass_touchdown': [1]
        }
        df_bronze = pd.DataFrame(bronze_data)
        self.db_manager.insert_dataframe(df_bronze, 'raw_plays', 'bronze')
        
        # 2. Transform and insert into silver
        # Simulate transformation
        silver_data = {
            'play_key': ['2024_01_KC_BUF_100'],
            'game_id': ['2024_01_KC_BUF'],
            'play_id': [100],
            'season': [2024],
            'week': [1],
            'player_id': ['P_Mahomes'],
            'player_name': ['Patrick Mahomes'],
            'passing_yards': [25.0],
            'passing_tds': [1]
        }
        df_silver = pd.DataFrame(silver_data)
        self.db_manager.insert_dataframe(df_silver, 'plays', 'silver')
        
        # 3. Calculate metrics and insert into gold
        gold_data = {
            'metric_key': ['P_Mahomes_2024_ppr'],
            'player_id': ['P_Mahomes'],
            'player_name': ['Patrick Mahomes'],
            'season': [2024],
            'avg_fantasy_points_ppr': [25.5]
        }
        df_gold = pd.DataFrame(gold_data)
        self.db_manager.insert_dataframe(df_gold, 'player_metrics', 'gold')
        
        # Verify data in each layer
        bronze_count = self.db_manager.execute_query(
            "SELECT COUNT(*) FROM bronze.raw_plays"
        )[0][0]
        self.assertEqual(bronze_count, 1)
        
        silver_count = self.db_manager.execute_query(
            "SELECT COUNT(*) FROM silver.plays"
        )[0][0]
        self.assertEqual(silver_count, 1)
        
        gold_count = self.db_manager.execute_query(
            "SELECT COUNT(*) FROM gold.player_metrics"
        )[0][0]
        self.assertEqual(gold_count, 1)
    
    def test_views_creation(self):
        """Test that views are created correctly"""
        # Insert test data for views
        data = {
            'ranking_key': ['P001_2024_5_ppr'],
            'player_id': ['P001'],
            'player_name': ['Test Player'],
            'season': [2024],
            'week': [5],
            'scoring_format': ['ppr']
        }
        df = pd.DataFrame(data)
        self.db_manager.insert_dataframe(df, 'player_rankings', 'gold')
        
        # Test view query
        result = self.db_manager.execute_query(
            "SELECT COUNT(*) FROM gold.current_player_rankings_ppr"
        )
        # View should return results (may be 0 if no current week data)
        self.assertIsNotNone(result)


if __name__ == '__main__':
    unittest.main()
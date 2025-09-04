#!/usr/bin/env python3
"""
Data Transformation Orchestration Script
Transforms raw NFL data from bronze layer through silver to gold layer
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database.connection import get_db_manager
from transformers.fantasy_calculator import FantasyCalculator
from transformers.cleaner import DataCleaner
from transformers.aggregator import StatsAggregator
from extractors.nflverse_extractor import NFLverseExtractor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/tmp/nfl_transformation.log')
    ]
)
logger = logging.getLogger(__name__)


class DataTransformationOrchestrator:
    """
    Orchestrates the transformation of NFL data through the medallion architecture.
    """
    
    def __init__(self):
        """Initialize the orchestrator."""
        self.db_manager = get_db_manager()
        self.cleaner = DataCleaner()
        self.aggregator = StatsAggregator()
        self.fantasy_calculators = {
            'standard': FantasyCalculator('standard'),
            'ppr': FantasyCalculator('ppr'),
            'half_ppr': FantasyCalculator('half_ppr')
        }
        self.results = []
        
        logger.info("Data transformation orchestrator initialized")
    
    def transform_weekly_stats(self, force_recalc: bool = False) -> Dict[str, Any]:
        """
        Transform weekly stats from nflverse to silver and gold layers.
        This is the simpler path using pre-calculated fantasy points.
        
        Args:
            force_recalc: Force recalculation of fantasy points
            
        Returns:
            Transformation results
        """
        logger.info("Starting weekly stats transformation")
        start_time = datetime.now()
        
        try:
            # 1. Extract weekly stats from nflverse (already has fantasy points)
            logger.info("Extracting weekly stats from nflverse...")
            extractor = NFLverseExtractor()
            weekly_data = extractor.extract(data_type='weekly_stats')
            
            if weekly_data is None or weekly_data.empty:
                logger.warning("No weekly data extracted")
                return {'status': 'no_data', 'message': 'No weekly stats available'}
            
            logger.info(f"Extracted {len(weekly_data)} weekly stat records")
            
            # 2. Clean and standardize data
            logger.info("Cleaning weekly stats data...")
            cleaned_data = self.cleaner.clean_weekly_stats(weekly_data)
            
            # 3. Add half-PPR points (calculated from standard and PPR)
            calc = self.fantasy_calculators['half_ppr']
            cleaned_data = calc.calculate_half_ppr_from_others(cleaned_data)
            
            # 4. Verify fantasy points if requested
            if force_recalc:
                logger.info("Verifying fantasy point calculations...")
                for scoring in ['standard', 'ppr']:
                    calc = self.fantasy_calculators[scoring]
                    if scoring == 'standard':
                        actual_col = 'fantasy_points'
                    else:
                        actual_col = f'fantasy_points_{scoring}'
                    
                    cleaned_data = calc.verify_fantasy_points(
                        cleaned_data, 
                        actual_col=actual_col,
                        tolerance=0.5
                    )
            
            # 5. Calculate advanced metrics
            logger.info("Calculating advanced metrics...")
            calc = self.fantasy_calculators['ppr']
            cleaned_data = calc.calculate_advanced_metrics(cleaned_data)
            
            # 6. Load to silver layer (player_week_stats)
            logger.info("Loading to silver.player_week_stats...")
            success = self._load_to_silver_week_stats(cleaned_data)
            
            if not success:
                return {'status': 'failed', 'message': 'Failed to load to silver layer'}
            
            # 7. Calculate consistency metrics and load to gold layer
            logger.info("Calculating consistency metrics for gold layer...")
            metrics_data = self._calculate_player_metrics(cleaned_data)
            
            if metrics_data is not None and not metrics_data.empty:
                logger.info("Loading metrics to gold.player_metrics...")
                self.db_manager.insert_dataframe(metrics_data, 'player_metrics', 'gold')
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            return {
                'status': 'success',
                'records_processed': len(cleaned_data),
                'duration_seconds': duration,
                'layers_updated': ['silver.player_week_stats', 'gold.player_metrics']
            }
            
        except Exception as e:
            logger.error(f"Weekly stats transformation failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now()
            }
    
    def transform_play_by_play(self) -> Dict[str, Any]:
        """
        Transform play-by-play data from bronze to silver layer.
        This is the detailed path for granular analysis.
        
        Returns:
            Transformation results
        """
        logger.info("Starting play-by-play transformation")
        start_time = datetime.now()
        
        try:
            # 1. Read from bronze layer
            logger.info("Reading play-by-play data from bronze layer...")
            pbp_data = self.db_manager.execute_query_df("""
                SELECT * FROM bronze.raw_plays
                WHERE season >= 2020
                ORDER BY season, week, game_id, play_id
            """)
            
            if pbp_data.empty:
                logger.warning("No play-by-play data in bronze layer")
                return {'status': 'no_data', 'message': 'Bronze layer is empty'}
            
            logger.info(f"Read {len(pbp_data)} plays from bronze layer")
            
            # 2. Clean data
            logger.info("Cleaning play-by-play data...")
            cleaned_plays = self.cleaner.clean_play_by_play(pbp_data)
            
            # 3. Aggregate to game level
            logger.info("Aggregating to game level...")
            game_stats = self.aggregator.aggregate_to_game_level(cleaned_plays)
            
            # 4. Calculate fantasy points for each format
            logger.info("Calculating fantasy points...")
            for scoring_format in ['standard', 'ppr', 'half_ppr']:
                calc = self.fantasy_calculators[scoring_format]
                game_stats = calc.calculate_dataframe_points(game_stats, suffix=scoring_format)
            
            # 5. Load to silver layer
            logger.info("Loading to silver.player_game_stats...")
            self.db_manager.insert_dataframe(game_stats, 'player_game_stats', 'silver')
            
            # 6. Aggregate to week level
            logger.info("Aggregating to week level...")
            week_stats = self.aggregator.aggregate_to_week_level(game_stats)
            
            # 7. Load week stats to silver
            logger.info("Loading to silver.player_week_stats...")
            self.db_manager.insert_dataframe(week_stats, 'player_week_stats', 'silver')
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            return {
                'status': 'success',
                'plays_processed': len(pbp_data),
                'games_created': len(game_stats),
                'weeks_created': len(week_stats),
                'duration_seconds': duration
            }
            
        except Exception as e:
            logger.error(f"Play-by-play transformation failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now()
            }
    
    def _load_to_silver_week_stats(self, df) -> bool:
        """
        Load cleaned weekly stats to silver layer.
        
        Args:
            df: DataFrame with weekly stats
            
        Returns:
            Success status
        """
        try:
            # Map columns to match silver.player_week_stats schema
            column_mapping = {
                'player_display_name': 'player_name',
                'recent_team': 'team',
                'fantasy_points': 'fantasy_points_standard',
                'carries': 'rushing_attempts'
            }
            
            df_mapped = df.rename(columns=column_mapping)
            
            # Select only columns that exist in the target table
            target_columns = self.db_manager.get_table_info('player_week_stats', 'silver')['column_name'].tolist()
            available_columns = [col for col in df_mapped.columns if col in target_columns]
            
            df_final = df_mapped[available_columns].copy()
            
            # Add processed timestamp
            df_final['processed_at'] = datetime.now()
            
            # Remove duplicates based on key
            if 'player_week_key' in df_final.columns:
                df_final = df_final.drop_duplicates(subset=['player_week_key'])
            
            # Insert into database
            self.db_manager.insert_dataframe(df_final, 'player_week_stats', 'silver')
            logger.info(f"Loaded {len(df_final)} records to silver.player_week_stats")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load to silver layer: {e}")
            return False
    
    def _calculate_player_metrics(self, week_stats_df) -> Optional[Any]:
        """
        Calculate player metrics for the gold layer.
        
        Args:
            week_stats_df: DataFrame with weekly stats
            
        Returns:
            DataFrame with player metrics
        """
        try:
            # Group by player and season
            metrics_list = []
            
            for (player_id, season), group in week_stats_df.groupby(['player_id', 'season']):
                if len(group) < 4:  # Skip players with less than 4 games
                    continue
                
                # Get player info
                player_name = group['player_name'].iloc[0]
                position = group['position'].iloc[0] if 'position' in group.columns else None
                team = group['team'].mode()[0] if 'team' in group.columns and not group['team'].empty else None
                
                # Calculate consistency metrics for each scoring format
                for scoring in ['ppr', 'standard', 'half_ppr']:
                    points_col = f'fantasy_points_{scoring}'
                    if points_col not in group.columns:
                        if scoring == 'standard':
                            points_col = 'fantasy_points'
                        else:
                            continue
                    
                    if points_col in group.columns:
                        calc = self.fantasy_calculators[scoring]
                        metrics = calc.calculate_consistency_metrics(group, points_col)
                        
                        if metrics['consistency_score'] is not None:
                            metric_record = {
                                'metric_key': f'{player_id}_{season}_{scoring}',
                                'player_id': player_id,
                                'player_name': player_name,
                                'position': position,
                                'team': team,
                                'season': season,
                                'games_played': metrics['games_played'],
                                'consistency_score': metrics['consistency_score'],
                                'floor_score': metrics['floor'],
                                'ceiling_score': metrics['ceiling'],
                                'boom_rate': metrics['boom_rate'],
                                'bust_rate': metrics['bust_rate'],
                                'boom_threshold': metrics['boom_threshold'],
                                'bust_threshold': metrics['bust_threshold'],
                                f'avg_fantasy_points_{scoring}': group[points_col].mean(),
                                'calculated_at': datetime.now()
                            }
                            
                            metrics_list.append(metric_record)
            
            if metrics_list:
                import pandas as pd
                metrics_df = pd.DataFrame(metrics_list)
                logger.info(f"Calculated metrics for {len(metrics_df)} player-season-format combinations")
                return metrics_df
            else:
                logger.warning("No metrics calculated")
                return None
                
        except Exception as e:
            logger.error(f"Failed to calculate player metrics: {e}")
            return None
    
    def run_full_transformation(self, include_pbp: bool = False) -> Dict[str, Any]:
        """
        Run the complete transformation pipeline.
        
        Args:
            include_pbp: Whether to include play-by-play transformation
            
        Returns:
            Summary of transformation results
        """
        logger.info("Starting full transformation pipeline")
        start_time = datetime.now()
        results = {}
        
        # 1. Transform weekly stats (primary path with pre-calculated fantasy points)
        logger.info("=== Transforming Weekly Stats ===")
        weekly_result = self.transform_weekly_stats()
        results['weekly_stats'] = weekly_result
        
        # 2. Optionally transform play-by-play data
        if include_pbp:
            logger.info("=== Transforming Play-by-Play Data ===")
            pbp_result = self.transform_play_by_play()
            results['play_by_play'] = pbp_result
        
        # 3. Calculate season totals
        logger.info("=== Calculating Season Totals ===")
        season_result = self._calculate_season_totals()
        results['season_totals'] = season_result
        
        # 4. Post-transformation tasks
        self._post_transformation_tasks()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        summary = {
            'start_time': start_time,
            'end_time': end_time,
            'duration_seconds': duration,
            'transformations': results,
            'success_count': sum(1 for r in results.values() if r.get('status') == 'success'),
            'error_count': sum(1 for r in results.values() if r.get('status') == 'error')
        }
        
        logger.info(f"Transformation pipeline completed in {duration:.2f} seconds")
        
        return summary
    
    def _calculate_season_totals(self) -> Dict[str, Any]:
        """
        Calculate and store season totals in gold layer.
        
        Returns:
            Results of season total calculation
        """
        try:
            # Read week stats from silver layer
            week_stats = self.db_manager.execute_query_df("""
                SELECT * FROM silver.player_week_stats
                ORDER BY player_id, season, week
            """)
            
            if week_stats.empty:
                return {'status': 'no_data', 'message': 'No weekly stats to aggregate'}
            
            # Aggregate to season level
            season_stats = self.aggregator.aggregate_to_season_level(week_stats)
            
            # Load to gold layer
            self.db_manager.insert_dataframe(season_stats, 'player_season_totals', 'gold')
            
            logger.info(f"Calculated season totals for {len(season_stats)} player-seasons")
            
            return {
                'status': 'success',
                'records_created': len(season_stats)
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate season totals: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _post_transformation_tasks(self):
        """Run post-transformation tasks."""
        try:
            logger.info("Running post-transformation tasks...")
            
            # Update database statistics
            self.db_manager.analyze()
            
            # Log transformation metadata
            metadata = {
                'timestamp': datetime.now().isoformat(),
                'tables_updated': [
                    'silver.player_week_stats',
                    'silver.player_game_stats',
                    'gold.player_metrics',
                    'gold.player_season_totals'
                ]
            }
            
            with open('/tmp/transformation_metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info("Post-transformation tasks completed")
            
        except Exception as e:
            logger.error(f"Post-transformation tasks failed: {e}")


def main():
    """Main entry point for transformation script."""
    parser = argparse.ArgumentParser(
        description='Transform NFL data through medallion architecture'
    )
    parser.add_argument(
        '--include-pbp',
        action='store_true',
        help='Include play-by-play transformation (slower)'
    )
    parser.add_argument(
        '--force-recalc',
        action='store_true',
        help='Force recalculation of fantasy points'
    )
    parser.add_argument(
        '--type',
        choices=['weekly', 'pbp', 'season', 'all'],
        default='all',
        help='Type of transformation to run'
    )
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = DataTransformationOrchestrator()
    
    # Run transformation based on type
    if args.type == 'all':
        results = orchestrator.run_full_transformation(include_pbp=args.include_pbp)
    elif args.type == 'weekly':
        results = orchestrator.transform_weekly_stats(force_recalc=args.force_recalc)
    elif args.type == 'pbp':
        results = orchestrator.transform_play_by_play()
    elif args.type == 'season':
        results = orchestrator._calculate_season_totals()
    
    # Print results
    print(json.dumps(results, indent=2, default=str))
    
    # Exit with appropriate code
    if isinstance(results, dict):
        if results.get('status') == 'error' or results.get('error_count', 0) > 0:
            sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()
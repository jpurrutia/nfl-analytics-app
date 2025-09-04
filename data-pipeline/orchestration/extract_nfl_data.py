#!/usr/bin/env python3
"""
NFL Data Extraction Orchestration Script
Coordinates extraction of NFL data from various sources into the bronze layer
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database.connection import get_db_manager
from extractors.nflverse_extractor import NFLverseExtractor
from extractors.config import get_extraction_config, get_seasons_to_extract

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/tmp/nfl_extraction.log')
    ]
)
logger = logging.getLogger(__name__)


class NFLDataOrchestrator:
    """
    Orchestrates the extraction of NFL data from multiple sources.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize the orchestrator.
        
        Args:
            config: Extraction configuration
        """
        self.config = config or get_extraction_config()
        self.db_manager = get_db_manager()
        self.extractors = {}
        self.results = []
        
        # Initialize extractors
        self._initialize_extractors()
        
        logger.info("NFL Data Orchestrator initialized")
    
    def _initialize_extractors(self):
        """Initialize all configured extractors."""
        sources = self.config.get('sources', {})
        
        if sources.get('nflverse', {}).get('enabled', False):
            self.extractors['nflverse'] = NFLverseExtractor()
            logger.info("Initialized NFLverse extractor")
    
    def extract_play_by_play(self, seasons: List[int] = None, 
                            incremental: bool = True) -> Dict[str, Any]:
        """
        Extract play-by-play data.
        
        Args:
            seasons: List of seasons to extract (default: from config)
            incremental: Whether to extract incrementally
            
        Returns:
            Extraction results
        """
        logger.info("Starting play-by-play extraction")
        
        if 'nflverse' not in self.extractors:
            logger.error("NFLverse extractor not available")
            return {'status': 'error', 'message': 'NFLverse extractor not available'}
        
        extractor = self.extractors['nflverse']
        
        try:
            if incremental and False:  # Disable incremental for now
                # Extract only new data
                data = extractor.extract_incremental(
                    table_name='raw_plays',
                    data_type='play_by_play'
                )
            else:
                # Extract specified seasons or all configured seasons
                seasons = seasons or get_seasons_to_extract()
                data = extractor.extract(data_type='play_by_play', seasons=seasons)
            
            if data is not None and not data.empty:
                # Validate data
                validated_data, errors = extractor.validate(data)
                
                if not validated_data.empty:
                    # Load to bronze layer
                    success = extractor.load_to_bronze(validated_data, 'raw_plays')
                    
                    result = {
                        'status': 'success' if success else 'failed',
                        'records': len(validated_data),
                        'validation_errors': errors,
                        'timestamp': datetime.now()
                    }
                else:
                    result = {
                        'status': 'validation_failed',
                        'validation_errors': errors,
                        'timestamp': datetime.now()
                    }
            else:
                result = {
                    'status': 'no_data',
                    'message': 'No new data to extract',
                    'timestamp': datetime.now()
                }
            
            self.results.append(result)
            return result
            
        except Exception as e:
            logger.error(f"Play-by-play extraction failed: {e}")
            result = {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now()
            }
            self.results.append(result)
            return result
    
    def extract_weekly_stats(self, seasons: List[int] = None,
                            positions: List[str] = None) -> Dict[str, Any]:
        """
        Extract weekly player statistics.
        
        Args:
            seasons: List of seasons to extract
            positions: List of positions to include
            
        Returns:
            Extraction results
        """
        logger.info("Starting weekly stats extraction")
        
        if 'nflverse' not in self.extractors:
            logger.error("NFLverse extractor not available")
            return {'status': 'error', 'message': 'NFLverse extractor not available'}
        
        extractor = self.extractors['nflverse']
        
        try:
            seasons = seasons or get_seasons_to_extract()
            data = extractor.extract(
                data_type='weekly_stats',
                seasons=seasons,
                positions=positions
            )
            
            if data is not None and not data.empty:
                # For weekly stats, we might want a different target table
                # For now, we'll create a generic stats table
                success = extractor.load_to_bronze(data, 'raw_weekly_stats')
                
                result = {
                    'status': 'success' if success else 'failed',
                    'records': len(data),
                    'timestamp': datetime.now()
                }
            else:
                result = {
                    'status': 'no_data',
                    'message': 'No stats data extracted',
                    'timestamp': datetime.now()
                }
            
            self.results.append(result)
            return result
            
        except Exception as e:
            logger.error(f"Weekly stats extraction failed: {e}")
            result = {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now()
            }
            self.results.append(result)
            return result
    
    def extract_rosters(self, seasons: List[int] = None) -> Dict[str, Any]:
        """
        Extract roster data.
        
        Args:
            seasons: List of seasons to extract
            
        Returns:
            Extraction results
        """
        logger.info("Starting roster extraction")
        
        if 'nflverse' not in self.extractors:
            logger.error("NFLverse extractor not available")
            return {'status': 'error', 'message': 'NFLverse extractor not available'}
        
        extractor = self.extractors['nflverse']
        
        try:
            seasons = seasons or get_seasons_to_extract()
            data = extractor.extract(data_type='roster', seasons=seasons)
            
            if data is not None and not data.empty:
                # Map roster data to our schema
                # Note: You might need to transform column names to match bronze.raw_rosters
                success = extractor.load_to_bronze(data, 'raw_rosters')
                
                result = {
                    'status': 'success' if success else 'failed',
                    'records': len(data),
                    'timestamp': datetime.now()
                }
            else:
                result = {
                    'status': 'no_data',
                    'message': 'No roster data extracted',
                    'timestamp': datetime.now()
                }
            
            self.results.append(result)
            return result
            
        except Exception as e:
            logger.error(f"Roster extraction failed: {e}")
            result = {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now()
            }
            self.results.append(result)
            return result
    
    def run_full_extraction(self, force: bool = False) -> Dict[str, Any]:
        """
        Run full extraction pipeline for all data types.
        
        Args:
            force: Force full extraction even if data exists
            
        Returns:
            Summary of all extraction results
        """
        logger.info("Starting full extraction pipeline")
        start_time = datetime.now()
        
        extraction_tasks = [
            ('play_by_play', self.extract_play_by_play),
            ('weekly_stats', self.extract_weekly_stats),
            ('rosters', self.extract_rosters)
        ]
        
        results = {}
        
        for task_name, task_func in extraction_tasks:
            logger.info(f"Running {task_name} extraction...")
            
            try:
                if task_name == 'play_by_play':
                    result = task_func(incremental=not force)
                else:
                    result = task_func()
                
                results[task_name] = result
                
                # Log progress to database
                self._log_extraction_progress(task_name, result)
                
            except Exception as e:
                logger.error(f"Task {task_name} failed: {e}")
                results[task_name] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        # Post-extraction tasks
        self._post_extraction_tasks()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        summary = {
            'start_time': start_time,
            'end_time': end_time,
            'duration_seconds': duration,
            'tasks': results,
            'success_count': sum(1 for r in results.values() if r.get('status') == 'success'),
            'error_count': sum(1 for r in results.values() if r.get('status') == 'error')
        }
        
        logger.info(f"Extraction pipeline completed in {duration:.2f} seconds")
        logger.info(f"Success: {summary['success_count']}, Errors: {summary['error_count']}")
        
        return summary
    
    def _log_extraction_progress(self, task_name: str, result: Dict[str, Any]):
        """
        Log extraction progress to the database.
        
        Args:
            task_name: Name of the extraction task
            result: Extraction result
        """
        try:
            # Log to PostgreSQL if available
            # For now, we'll just log to file
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'task': task_name,
                'status': result.get('status'),
                'records': result.get('records', 0),
                'errors': result.get('validation_errors', [])
            }
            
            with open('/tmp/extraction_log.json', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
                
        except Exception as e:
            logger.error(f"Failed to log extraction progress: {e}")
    
    def _post_extraction_tasks(self):
        """Run post-extraction tasks like vacuum and analyze."""
        try:
            logger.info("Running post-extraction tasks...")
            
            # Vacuum and analyze the database
            self.db_manager.vacuum()
            self.db_manager.analyze()
            
            logger.info("Post-extraction tasks completed")
            
        except Exception as e:
            logger.error(f"Post-extraction tasks failed: {e}")
    
    def check_data_freshness(self) -> Dict[str, Any]:
        """
        Check the freshness of all data in bronze layer.
        
        Returns:
            Dictionary with freshness information for each table
        """
        tables = ['raw_plays', 'raw_adp', 'raw_rosters', 'raw_weekly_stats']
        freshness_report = {}
        
        for table in tables:
            try:
                if self.db_manager.table_exists(table, 'bronze'):
                    if 'nflverse' in self.extractors:
                        freshness = self.extractors['nflverse'].check_data_freshness(table)
                    else:
                        freshness = {'error': 'No extractor available'}
                else:
                    freshness = {'exists': False}
                
                freshness_report[table] = freshness
                
            except Exception as e:
                freshness_report[table] = {'error': str(e)}
        
        return freshness_report


def main():
    """Main entry point for the extraction script."""
    parser = argparse.ArgumentParser(
        description='Extract NFL data into the analytics database'
    )
    parser.add_argument(
        '--seasons',
        type=int,
        nargs='+',
        help='Seasons to extract (e.g., 2021 2022 2023)'
    )
    parser.add_argument(
        '--data-type',
        choices=['play_by_play', 'weekly_stats', 'rosters', 'all'],
        default='all',
        help='Type of data to extract'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force full extraction even if data exists'
    )
    parser.add_argument(
        '--check-freshness',
        action='store_true',
        help='Check data freshness and exit'
    )
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = NFLDataOrchestrator()
    
    # Check freshness if requested
    if args.check_freshness:
        freshness = orchestrator.check_data_freshness()
        print(json.dumps(freshness, indent=2, default=str))
        sys.exit(0)
    
    # Run extraction
    if args.data_type == 'all':
        results = orchestrator.run_full_extraction(force=args.force)
    elif args.data_type == 'play_by_play':
        results = orchestrator.extract_play_by_play(
            seasons=args.seasons,
            incremental=not args.force
        )
    elif args.data_type == 'weekly_stats':
        results = orchestrator.extract_weekly_stats(seasons=args.seasons)
    elif args.data_type == 'rosters':
        results = orchestrator.extract_rosters(seasons=args.seasons)
    
    # Print results
    print(json.dumps(results, indent=2, default=str))
    
    # Exit with appropriate code
    if isinstance(results, dict):
        if results.get('status') == 'error' or results.get('error_count', 0) > 0:
            sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()
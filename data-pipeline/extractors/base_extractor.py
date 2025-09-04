"""
Base extractor class for all data sources
Provides common functionality for data extraction, validation, and error handling
"""

import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from database.connection import get_db_manager
from extractors.config import EXTRACTION_SETTINGS

logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """
    Abstract base class for data extractors.
    Provides common functionality for all data sources.
    """
    
    def __init__(self, source_name: str, config: Dict[str, Any] = None):
        """
        Initialize the base extractor.
        
        Args:
            source_name: Name of the data source
            config: Configuration dictionary for the extractor
        """
        self.source_name = source_name
        self.config = config or {}
        self.db_manager = get_db_manager()
        
        # Extraction metadata
        self.extraction_start_time = None
        self.extraction_end_time = None
        self.records_extracted = 0
        self.records_failed = 0
        self.errors = []
        
        # Retry settings
        self.max_retries = self.config.get('retry_attempts', EXTRACTION_SETTINGS['max_retries'])
        self.retry_delay = self.config.get('retry_delay', EXTRACTION_SETTINGS['retry_delay'])
        
        logger.info(f"Initialized {source_name} extractor")
    
    @abstractmethod
    def extract(self, **kwargs) -> pd.DataFrame:
        """
        Extract data from the source.
        Must be implemented by subclasses.
        
        Returns:
            DataFrame with extracted data
        """
        pass
    
    @abstractmethod
    def validate(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Validate extracted data.
        Must be implemented by subclasses.
        
        Args:
            data: DataFrame to validate
            
        Returns:
            Tuple of (validated DataFrame, list of validation errors)
        """
        pass
    
    def extract_with_retry(self, **kwargs) -> Optional[pd.DataFrame]:
        """
        Extract data with retry logic.
        
        Returns:
            DataFrame with extracted data, or None if all retries failed
        """
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Extraction attempt {attempt + 1}/{self.max_retries}")
                data = self.extract(**kwargs)
                
                if data is not None and not data.empty:
                    logger.info(f"Successfully extracted {len(data)} records")
                    return data
                else:
                    logger.warning("Extracted empty dataset")
                    
            except Exception as e:
                logger.error(f"Extraction failed on attempt {attempt + 1}: {e}")
                self.errors.append({
                    'timestamp': datetime.now(),
                    'attempt': attempt + 1,
                    'error': str(e)
                })
                
                if attempt < self.max_retries - 1:
                    logger.info(f"Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"All extraction attempts failed for {self.source_name}")
        
        return None
    
    def load_to_bronze(self, data: pd.DataFrame, table_name: str) -> bool:
        """
        Load data to the bronze layer.
        
        Args:
            data: DataFrame to load
            table_name: Target table name (without schema)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Add ingestion timestamp
            data['ingested_at'] = datetime.now()
            
            # Load to database
            self.db_manager.insert_dataframe(data, table_name, 'bronze')
            logger.info(f"Loaded {len(data)} records to bronze.{table_name}")
            
            self.records_extracted += len(data)
            return True
            
        except Exception as e:
            logger.error(f"Failed to load data to bronze layer: {e}")
            self.records_failed += len(data)
            return False
    
    def run_extraction(self, target_table: str, **kwargs) -> Dict[str, Any]:
        """
        Run the complete extraction process.
        
        Args:
            target_table: Target table in bronze layer
            **kwargs: Additional arguments for extraction
            
        Returns:
            Dictionary with extraction results
        """
        self.extraction_start_time = datetime.now()
        logger.info(f"Starting extraction for {self.source_name} to bronze.{target_table}")
        
        try:
            # Extract data
            data = self.extract_with_retry(**kwargs)
            
            if data is None or data.empty:
                logger.warning("No data extracted")
                return self._get_extraction_results('no_data')
            
            # Validate data
            validated_data, validation_errors = self.validate(data)
            
            if validation_errors:
                logger.warning(f"Validation errors: {validation_errors}")
                self.errors.extend(validation_errors)
            
            if validated_data.empty:
                logger.error("No valid data after validation")
                return self._get_extraction_results('validation_failed')
            
            # Load to bronze layer
            success = self.load_to_bronze(validated_data, target_table)
            
            if success:
                return self._get_extraction_results('success')
            else:
                return self._get_extraction_results('load_failed')
                
        except Exception as e:
            logger.error(f"Extraction process failed: {e}")
            self.errors.append({
                'timestamp': datetime.now(),
                'stage': 'extraction',
                'error': str(e)
            })
            return self._get_extraction_results('error')
        
        finally:
            self.extraction_end_time = datetime.now()
    
    def _get_extraction_results(self, status: str) -> Dict[str, Any]:
        """
        Get extraction results summary.
        
        Args:
            status: Extraction status
            
        Returns:
            Dictionary with extraction results
        """
        duration = None
        if self.extraction_start_time and self.extraction_end_time:
            duration = (self.extraction_end_time - self.extraction_start_time).total_seconds()
        
        return {
            'source': self.source_name,
            'status': status,
            'start_time': self.extraction_start_time,
            'end_time': self.extraction_end_time,
            'duration_seconds': duration,
            'records_extracted': self.records_extracted,
            'records_failed': self.records_failed,
            'errors': self.errors
        }
    
    def check_data_freshness(self, table_name: str, schema: str = 'bronze') -> Dict[str, Any]:
        """
        Check the freshness of data in a table.
        
        Args:
            table_name: Table to check
            schema: Schema name
            
        Returns:
            Dictionary with freshness information
        """
        try:
            result = self.db_manager.execute_query_df(f"""
                SELECT 
                    COUNT(*) as record_count,
                    MAX(ingested_at) as latest_ingestion,
                    MIN(ingested_at) as earliest_ingestion
                FROM {schema}.{table_name}
            """)
            
            if not result.empty:
                row = result.iloc[0]
                latest = row['latest_ingestion']
                
                if latest:
                    age_hours = (datetime.now() - latest).total_seconds() / 3600
                else:
                    age_hours = None
                
                return {
                    'table': f'{schema}.{table_name}',
                    'record_count': row['record_count'],
                    'latest_ingestion': latest,
                    'earliest_ingestion': row['earliest_ingestion'],
                    'age_hours': age_hours,
                    'is_stale': age_hours > 24 if age_hours else True
                }
            else:
                return {
                    'table': f'{schema}.{table_name}',
                    'record_count': 0,
                    'is_stale': True
                }
                
        except Exception as e:
            logger.error(f"Failed to check data freshness: {e}")
            return {
                'table': f'{schema}.{table_name}',
                'error': str(e)
            }
    
    def get_extraction_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the extractor.
        
        Returns:
            Dictionary with extractor metadata
        """
        return {
            'source_name': self.source_name,
            'config': self.config,
            'records_extracted': self.records_extracted,
            'records_failed': self.records_failed,
            'errors_count': len(self.errors),
            'last_extraction': self.extraction_end_time
        }
"""
DuckDB Connection Manager for NFL Analytics Platform
Provides connection pooling and query execution for the analytics database
"""

import os
import logging
import threading
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union
from pathlib import Path

import duckdb
import pandas as pd

logger = logging.getLogger(__name__)


class DuckDBConnectionManager:
    """
    Manages DuckDB connections with thread-safe operations
    and connection pooling capabilities.
    """
    
    def __init__(self, database_path: Optional[str] = None):
        """
        Initialize the DuckDB connection manager.
        
        Args:
            database_path: Path to the DuckDB database file.
                          If None, uses environment variable or default.
        """
        self.database_path = database_path or os.getenv(
            'DUCKDB_PATH', 
            '/data/analytics.db'
        )
        
        # Ensure directory exists
        db_dir = Path(self.database_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)
        
        # Thread-local storage for connections
        self._local = threading.local()
        
        # Lock for thread-safe operations
        self._lock = threading.Lock()
        
        # Initialize the database schema if needed
        self._initialize_database()
        
        logger.info(f"DuckDB connection manager initialized with database: {self.database_path}")
    
    def _initialize_database(self):
        """Initialize the database with schema if it doesn't exist."""
        try:
            with self.get_connection() as conn:
                # Check if schemas exist
                result = conn.execute("""
                    SELECT schema_name 
                    FROM information_schema.schemata 
                    WHERE schema_name IN ('bronze', 'silver', 'gold')
                """).fetchall()
                
                if len(result) < 3:
                    # Run initialization script
                    init_script_path = Path(__file__).parent / 'duckdb_init.sql'
                    if init_script_path.exists():
                        logger.info("Initializing database schema...")
                        with open(init_script_path, 'r') as f:
                            sql_script = f.read()
                        conn.execute(sql_script)
                        logger.info("Database schema initialized successfully")
                    else:
                        logger.warning(f"Initialization script not found at {init_script_path}")
                else:
                    logger.info("Database schema already exists")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """
        Get a thread-safe connection to the database.
        
        Yields:
            duckdb.DuckDBPyConnection: Database connection
        """
        # Check if this thread already has a connection
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            with self._lock:
                self._local.connection = duckdb.connect(
                    self.database_path,
                    read_only=False
                )
                logger.debug(f"Created new connection for thread {threading.current_thread().name}")
        
        try:
            yield self._local.connection
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise
    
    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[tuple]:
        """
        Execute a query and return results.
        
        Args:
            query: SQL query to execute
            params: Query parameters
            
        Returns:
            List of result tuples
        """
        with self.get_connection() as conn:
            if params:
                result = conn.execute(query, params).fetchall()
            else:
                result = conn.execute(query).fetchall()
            return result
    
    def execute_query_df(self, query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """
        Execute a query and return results as a pandas DataFrame.
        
        Args:
            query: SQL query to execute
            params: Query parameters
            
        Returns:
            Query results as DataFrame
        """
        with self.get_connection() as conn:
            if params:
                result = conn.execute(query, params).df()
            else:
                result = conn.execute(query).df()
            return result
    
    def insert_dataframe(self, df: pd.DataFrame, table_name: str, schema: str = 'bronze'):
        """
        Insert a pandas DataFrame into a DuckDB table.
        
        Args:
            df: DataFrame to insert
            table_name: Target table name
            schema: Target schema (default: bronze)
        """
        with self.get_connection() as conn:
            # Register the DataFrame as a temporary view
            conn.register('temp_df', df)
            
            # Get column list from DataFrame
            columns = ', '.join(df.columns)
            
            # Insert data with explicit column names
            conn.execute(f"""
                INSERT INTO {schema}.{table_name} ({columns})
                SELECT {columns} FROM temp_df
            """)
            
            # Unregister the temporary view
            conn.unregister('temp_df')
            
            logger.info(f"Inserted {len(df)} rows into {schema}.{table_name}")
    
    def bulk_insert(self, data: List[Dict[str, Any]], table_name: str, schema: str = 'bronze'):
        """
        Bulk insert data into a table.
        
        Args:
            data: List of dictionaries to insert
            table_name: Target table name
            schema: Target schema (default: bronze)
        """
        if not data:
            logger.warning("No data to insert")
            return
        
        df = pd.DataFrame(data)
        self.insert_dataframe(df, table_name, schema)
    
    def table_exists(self, table_name: str, schema: str = 'bronze') -> bool:
        """
        Check if a table exists.
        
        Args:
            table_name: Table name to check
            schema: Schema name
            
        Returns:
            True if table exists, False otherwise
        """
        query = """
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = ?
        """
        result = self.execute_query(query, [schema, table_name])
        return result[0][0] > 0 if result else False
    
    def get_table_info(self, table_name: str, schema: str = 'bronze') -> pd.DataFrame:
        """
        Get information about a table's columns.
        
        Args:
            table_name: Table name
            schema: Schema name
            
        Returns:
            DataFrame with column information
        """
        query = f"""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = '{schema}' 
            AND table_name = '{table_name}'
            ORDER BY ordinal_position
        """
        return self.execute_query_df(query)
    
    def get_table_stats(self, table_name: str, schema: str = 'bronze') -> Dict[str, Any]:
        """
        Get statistics about a table.
        
        Args:
            table_name: Table name
            schema: Schema name
            
        Returns:
            Dictionary with table statistics
        """
        with self.get_connection() as conn:
            # Row count
            count_result = conn.execute(
                f"SELECT COUNT(*) FROM {schema}.{table_name}"
            ).fetchone()
            row_count = count_result[0] if count_result else 0
            
            # Table size (approximate)
            size_result = conn.execute(f"""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('{schema}.{table_name}'))
                FROM (SELECT 1) t
                WHERE EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = '{schema}' AND table_name = '{table_name}'
                )
            """).fetchone()
            
            return {
                'row_count': row_count,
                'table_size': size_result[0] if size_result else 'N/A',
                'schema': schema,
                'table': table_name
            }
    
    def vacuum(self):
        """Run VACUUM to reclaim space and update statistics."""
        with self.get_connection() as conn:
            conn.execute("VACUUM")
            logger.info("Database vacuumed successfully")
    
    def analyze(self):
        """Run ANALYZE to update table statistics."""
        with self.get_connection() as conn:
            conn.execute("VACUUM ANALYZE")
            logger.info("Database statistics updated")
    
    def checkpoint(self):
        """Force a checkpoint to ensure data is written to disk."""
        with self.get_connection() as conn:
            conn.execute("CHECKPOINT")
            logger.info("Database checkpoint completed")
    
    def close_all_connections(self):
        """Close all connections in the current thread."""
        if hasattr(self._local, 'connection') and self._local.connection:
            self._local.connection.close()
            self._local.connection = None
            logger.info("Closed database connection")
    
    def export_to_parquet(self, query: str, output_path: str):
        """
        Export query results to a Parquet file.
        
        Args:
            query: SQL query to execute
            output_path: Path for the output Parquet file
        """
        with self.get_connection() as conn:
            conn.execute(f"""
                COPY ({query}) TO '{output_path}' (FORMAT PARQUET)
            """)
            logger.info(f"Exported query results to {output_path}")
    
    def import_from_parquet(self, file_path: str, table_name: str, schema: str = 'bronze'):
        """
        Import data from a Parquet file into a table.
        
        Args:
            file_path: Path to the Parquet file
            table_name: Target table name
            schema: Target schema
        """
        with self.get_connection() as conn:
            conn.execute(f"""
                INSERT INTO {schema}.{table_name}
                SELECT * FROM read_parquet('{file_path}')
            """)
            logger.info(f"Imported data from {file_path} to {schema}.{table_name}")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close all connections."""
        self.close_all_connections()


# Singleton instance
_db_manager = None
_lock = threading.Lock()


def get_db_manager(database_path: Optional[str] = None) -> DuckDBConnectionManager:
    """
    Get or create the singleton database manager instance.
    
    Args:
        database_path: Optional database path
        
    Returns:
        DuckDBConnectionManager instance
    """
    global _db_manager
    
    if _db_manager is None:
        with _lock:
            if _db_manager is None:
                _db_manager = DuckDBConnectionManager(database_path)
    
    return _db_manager


# Convenience functions
def execute_query(query: str, params: Optional[Dict[str, Any]] = None) -> List[tuple]:
    """Execute a query using the default connection manager."""
    return get_db_manager().execute_query(query, params)


def execute_query_df(query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """Execute a query and return DataFrame using the default connection manager."""
    return get_db_manager().execute_query_df(query, params)


def insert_dataframe(df: pd.DataFrame, table_name: str, schema: str = 'bronze'):
    """Insert a DataFrame using the default connection manager."""
    get_db_manager().insert_dataframe(df, table_name, schema)
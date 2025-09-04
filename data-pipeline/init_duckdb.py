#!/usr/bin/env python3
"""
Initialize DuckDB database with the medallion architecture schema
This script can be run standalone or via Docker Compose
"""

import os
import sys
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from database.connection import DuckDBConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def init_database(db_path: str = None):
    """
    Initialize the DuckDB database with all required schemas and tables.
    
    Args:
        db_path: Optional path to the database file
    """
    logger.info("Starting DuckDB initialization...")
    
    try:
        # Create connection manager
        db_manager = DuckDBConnectionManager(db_path)
        
        # Verify schemas are created
        with db_manager.get_connection() as conn:
            # Check schemas
            schemas = conn.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name IN ('bronze', 'silver', 'gold')
                ORDER BY schema_name
            """).fetchall()
            
            schema_names = [s[0] for s in schemas]
            logger.info(f"Created schemas: {', '.join(schema_names)}")
            
            # Count tables in each schema
            for schema in ['bronze', 'silver', 'gold']:
                table_count = conn.execute(f"""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = '{schema}'
                """).fetchone()[0]
                logger.info(f"Schema '{schema}' contains {table_count} tables")
            
            # Verify some key tables exist
            key_tables = [
                ('bronze', 'raw_plays'),
                ('bronze', 'raw_adp'),
                ('silver', 'player_game_stats'),
                ('silver', 'player_week_stats'),
                ('gold', 'player_metrics'),
                ('gold', 'player_rankings')
            ]
            
            for schema, table in key_tables:
                exists = conn.execute(f"""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = '{schema}' AND table_name = '{table}'
                """).fetchone()[0] > 0
                
                if exists:
                    logger.info(f"✓ Table {schema}.{table} exists")
                else:
                    logger.error(f"✗ Table {schema}.{table} missing")
            
            # Test insert capability
            logger.info("Testing write capability...")
            conn.execute("""
                INSERT INTO bronze.raw_adp (player_id, player_name, season)
                VALUES ('TEST001', 'Test Player', 2024)
            """)
            
            # Clean up test data
            conn.execute("""
                DELETE FROM bronze.raw_adp WHERE player_id = 'TEST001'
            """)
            logger.info("✓ Write test successful")
            
            # Get database size
            db_file = Path(db_manager.database_path)
            if db_file.exists():
                size_mb = db_file.stat().st_size / (1024 * 1024)
                logger.info(f"Database size: {size_mb:.2f} MB")
        
        logger.info("DuckDB initialization completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False
    finally:
        if 'db_manager' in locals():
            db_manager.close_all_connections()


def verify_database(db_path: str = None):
    """
    Verify the database is properly initialized and accessible.
    
    Args:
        db_path: Optional path to the database file
    """
    logger.info("Verifying DuckDB database...")
    
    try:
        db_manager = DuckDBConnectionManager(db_path)
        
        with db_manager.get_connection() as conn:
            # Run a simple query to verify connection
            result = conn.execute("SELECT 1").fetchone()
            if result[0] != 1:
                raise Exception("Basic query failed")
            
            # Check medallion architecture
            schemas = conn.execute("""
                SELECT COUNT(*) FROM information_schema.schemata 
                WHERE schema_name IN ('bronze', 'silver', 'gold')
            """).fetchone()[0]
            
            if schemas != 3:
                raise Exception(f"Expected 3 schemas, found {schemas}")
            
            logger.info("✓ Database verification successful")
            return True
            
    except Exception as e:
        logger.error(f"Database verification failed: {e}")
        return False
    finally:
        if 'db_manager' in locals():
            db_manager.close_all_connections()


def main():
    """Main entry point for the initialization script."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Initialize DuckDB database for NFL Analytics Platform'
    )
    parser.add_argument(
        '--db-path',
        type=str,
        default=os.getenv('DUCKDB_PATH', '/data/analytics.db'),
        help='Path to the DuckDB database file'
    )
    parser.add_argument(
        '--verify-only',
        action='store_true',
        help='Only verify the database without initializing'
    )
    
    args = parser.parse_args()
    
    if args.verify_only:
        success = verify_database(args.db_path)
    else:
        success = init_database(args.db_path)
        if success:
            verify_database(args.db_path)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
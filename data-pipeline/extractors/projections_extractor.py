"""
Projections Extractor using Polars for high-performance data processing
Handles BetOnline and Pinnacle projection data
"""
import polars as pl
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
import logging
from pathlib import Path
import psycopg2
from psycopg2.extras import execute_batch
import os
# from .base_extractor import BaseExtractor  # Optional - can inherit if base exists

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProjectionsExtractor:
    """Extract and process projections from multiple sources using Polars"""
    
    # Name mappings for standardization across sources
    NAME_MAPPINGS = {
        # Format: source_name -> standard_name
        "Tre Harris": "Tre' Harris",
        "Marvin Mims": "Marvin Mims Jr.",
        "Travis Etienne": "Travis Etienne Jr.",
        "Aaron Jones": "Aaron Jones Sr.",
        "Kyle Pitts": "Kyle Pitts Sr.",
        "Calvin Austin": "Calvin Austin III",
        "Ollie Gordon": "Ollie Gordon II",
        "Deebo Samuel Sr.": "Deebo Samuel",
        "Cameron Ward": "Cam Ward",
        "Marquise Brown": "Hollywood Brown",
    }
    
    # Pinnacle prop type to stat mapping
    PROP_TO_STAT = {
        "Touchdowns": "rushingTouchdowns",
        "Rushing Yards": "rushingYards",
        "Rush Attempts": "rushingAttempts",
        "Receiving Yards": "receivingYards",
        "Receptions": "receivingReceptions",
        "Touchdown Passes": "passingTouchdowns",
        "Pass Completions": "passingCompletions",
        "Pass Attempts": "passingAttempts",
        "Passing Yards": "passingYards",
        "Interceptions": "passingInterceptions",
    }
    
    def __init__(self, db_connection_string: str):
        """Initialize with database connection"""
        self.db_connection_string = db_connection_string
        
    def clean_betonline_data(self, file_path: str) -> pl.DataFrame:
        """
        Clean BetOnline projections data using Polars
        """
        logger.info(f"Processing BetOnline data from {file_path}")
        
        # Read parquet file with Polars
        df = pl.read_parquet(file_path)
        
        # Apply name mappings
        df = df.with_columns(
            pl.col("player_name").replace(self.NAME_MAPPINGS).alias("player_name")
        )
        
        # Handle defensive projections if present
        if "proj_defensiveTotalTackles" in df.columns:
            df = df.with_columns([
                (pl.col("proj_defensiveTotalTackles") * 0.75).alias("proj_defensiveSoloTackles"),
                (pl.col("proj_defensiveTotalTackles") * 0.5).alias("proj_defensiveAssistedTackles")
            ])
        
        # Ensure all projection columns exist with defaults
        projection_columns = [
            "proj_passingYards", "proj_passingCompletions", "proj_passingTouchdowns",
            "proj_passingAttempts", "proj_passingInterceptions",
            "proj_rushingYards", "proj_rushingAttempts", "proj_rushingTouchdowns",
            "proj_receivingYards", "proj_receivingReceptions", "proj_receivingTouchdowns"
        ]
        
        for col in projection_columns:
            if col not in df.columns:
                df = df.with_columns(pl.lit(0.0).alias(col))
                
        return df
    
    def clean_pinnacle_data(self, file_path: str) -> pl.DataFrame:
        """
        Clean Pinnacle props data and convert to projections format
        """
        logger.info(f"Processing Pinnacle data from {file_path}")
        
        # Read parquet file
        df = pl.read_parquet(file_path)
        
        # Map prop types to stat types
        df = df.with_columns(
            pl.col("PropType").replace(self.PROP_TO_STAT).alias("statType")
        )
        
        # Filter to only mapped prop types
        df = df.filter(pl.col("statType").is_in(list(self.PROP_TO_STAT.values())))
        
        # Apply name mappings
        df = df.with_columns(
            pl.col("Player").replace(self.NAME_MAPPINGS).alias("player_name")
        )
        
        # Fill NaN values in Value with ImpNoVig
        df = df.with_columns(
            pl.when(pl.col("Value").is_null())
            .then(pl.col("ImpNoVig"))
            .otherwise(pl.col("Value"))
            .alias("Value")
        )
        
        # Pivot to get Over/Under in separate columns
        df_pivot = df.pivot(
            values=["Price", "Implied", "ImpNoVig"],
            index=["officialDate", "week", "Away", "Home", "Player", "PropType", "Value", "BetTimeStamp"],
            columns="OverUnder"
        )
        
        # Calculate adjusted values based on juice
        df_pivot = df_pivot.with_columns([
            (pl.col("Implied_Over") + pl.col("Implied_Under")).alias("Juice"),
            (1 / pl.col("Implied_Over") - 1).alias("Over_Juice"),
            (1 / pl.col("Implied_Under") - 1).alias("Under_Juice"),
        ])
        
        df_pivot = df_pivot.with_columns([
            (pl.col("Under_Juice") - pl.col("Over_Juice")).alias("Juice_Diff")
        ])
        
        df_pivot = df_pivot.with_columns([
            (pl.col("Value") + (pl.col("Juice_Diff") * pl.col("Value") * 0.5)).alias("AdjValue")
        ])
        
        # Select and rename columns
        df_final = df_pivot.select([
            pl.col("week"),
            pl.col("Player").alias("player_name"),
            pl.col("PropType").replace(self.PROP_TO_STAT).alias("statType"),
            pl.col("AdjValue").alias("statValue")
        ])
        
        # Pivot to wide format with stat types as columns
        df_wide = df_final.pivot(
            values="statValue",
            index=["week", "player_name"],
            columns="statType",
            aggregate_function="mean"
        )
        
        # Split touchdowns by usage for RBs/WRs
        if "rushingTouchdowns" in df_wide.columns:
            df_wide = df_wide.with_columns([
                (pl.col("rushingTouchdowns") * 
                 (pl.col("receivingYards") / (pl.col("receivingYards") + pl.col("rushingYards")))
                ).alias("receivingTouchdowns"),
                (pl.col("rushingTouchdowns") * 
                 (pl.col("rushingYards") / (pl.col("receivingYards") + pl.col("rushingYards")))
                ).alias("rushingTouchdowns_adj")
            ])
            df_wide = df_wide.drop("rushingTouchdowns").rename({"rushingTouchdowns_adj": "rushingTouchdowns"})
        
        # Rename columns to match BetOnline format
        rename_map = {col: f"proj_{col}" for col in df_wide.columns if col not in ["week", "player_name"]}
        df_wide = df_wide.rename(rename_map)
        
        return df_wide
    
    def load_to_bronze(self, df: pl.DataFrame, source: str, season: int):
        """
        Load projections data to bronze.raw_projections table
        """
        logger.info(f"Loading {source} data to bronze.raw_projections")
        
        # Convert to pandas for psycopg2 compatibility
        df_pandas = df.to_pandas()
        
        # Add metadata columns
        df_pandas['source'] = source
        df_pandas['season'] = season
        df_pandas['timestamp'] = datetime.now()
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(self.db_connection_string)
        cur = conn.cursor()
        
        try:
            # Prepare insert query
            columns = [
                'source', 'week', 'season', 'player_name', 'position', 'team',
                'proj_passing_yards', 'proj_passing_completions', 'proj_passing_touchdowns',
                'proj_passing_attempts', 'proj_passing_interceptions',
                'proj_rushing_yards', 'proj_rushing_attempts', 'proj_rushing_touchdowns',
                'proj_receiving_yards', 'proj_receiving_receptions', 'proj_receiving_touchdowns',
                'timestamp'
            ]
            
            # Map camelCase columns to snake_case for database
            column_mapping = {
                'proj_passingYards': 'proj_passing_yards',
                'proj_passingCompletions': 'proj_passing_completions',
                'proj_passingTouchdowns': 'proj_passing_touchdowns',
                'proj_passingAttempts': 'proj_passing_attempts',
                'proj_passingInterceptions': 'proj_passing_interceptions',
                'proj_rushingYards': 'proj_rushing_yards',
                'proj_rushingAttempts': 'proj_rushing_attempts',
                'proj_rushingTouchdowns': 'proj_rushing_touchdowns',
                'proj_receivingYards': 'proj_receiving_yards',
                'proj_receivingReceptions': 'proj_receiving_receptions',
                'proj_receivingTouchdowns': 'proj_receiving_touchdowns'
            }
            
            # Rename columns
            df_pandas.rename(columns=column_mapping, inplace=True)
            
            # Replace NaN and 'NaN' strings with None for proper NULL handling
            import numpy as np
            df_pandas = df_pandas.replace({np.nan: None, 'NaN': None, 'nan': None})
            
            # Ensure all columns exist in dataframe
            for col in columns:
                if col not in df_pandas.columns:
                    if col.startswith('proj_'):
                        df_pandas[col] = 0.0
                    elif col in ['position', 'team']:
                        df_pandas[col] = None
            
            # Prepare values for insert
            values = df_pandas[columns].values.tolist()
            
            # Use ON CONFLICT to handle duplicates (prop_type can be NULL for BOL)
            insert_query = f"""
                INSERT INTO bronze.raw_projections ({', '.join(columns)})
                VALUES ({', '.join(['%s'] * len(columns))})
                ON CONFLICT (source, season, week, player_name) 
                DO UPDATE SET
                    timestamp = EXCLUDED.timestamp,
                    proj_passing_yards = EXCLUDED.proj_passing_yards,
                    proj_passing_completions = EXCLUDED.proj_passing_completions,
                    proj_passing_touchdowns = EXCLUDED.proj_passing_touchdowns,
                    proj_rushing_yards = EXCLUDED.proj_rushing_yards,
                    proj_receiving_yards = EXCLUDED.proj_receiving_yards,
                    proj_receiving_receptions = EXCLUDED.proj_receiving_receptions;
            """
            
            # Execute batch insert
            execute_batch(cur, insert_query, values, page_size=100)
            conn.commit()
            
            logger.info(f"Successfully loaded {len(values)} rows to bronze.raw_projections")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error loading data to bronze: {e}")
            raise
        finally:
            cur.close()
            conn.close()
    
    def extract_and_load(self, 
                        betonline_path: Optional[str] = None,
                        pinnacle_path: Optional[str] = None,
                        season: int = 2025,
                        week: Optional[int] = None):
        """
        Main extraction pipeline
        """
        logger.info(f"Starting projections extraction for Season {season}")
        
        if betonline_path and Path(betonline_path).exists():
            df_bol = self.clean_betonline_data(betonline_path)
            if week:
                df_bol = df_bol.filter(pl.col("week") == week)
            self.load_to_bronze(df_bol, "betonline", season)
        
        if pinnacle_path and Path(pinnacle_path).exists():
            df_pin = self.clean_pinnacle_data(pinnacle_path)
            if week:
                df_pin = df_pin.filter(pl.col("week") == week)
            self.load_to_bronze(df_pin, "pinnacle", season)
        
        logger.info("Projections extraction completed")


if __name__ == "__main__":
    # Example usage
    connection_string = os.getenv("DATABASE_URL", 
        "postgresql://app_user:dev_password_123@localhost:5432/fantasy_football")
    
    extractor = ProjectionsExtractor(connection_string)
    
    # Process the sample files
    extractor.extract_and_load(
        betonline_path="tmp/BetOnline_AllProps_Week_1.parquet",
        pinnacle_path="tmp/Pinnacle_Props_Week_1.parquet",
        season=2025,
        week=1
    )
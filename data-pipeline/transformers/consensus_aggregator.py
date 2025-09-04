"""
Consensus Aggregator - Combines projections from multiple sources
Transforms bronze → silver → gold layers
"""
import polars as pl
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
import psycopg2
from psycopg2.extras import execute_batch
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConsensusAggregator:
    """Aggregates projections from multiple sources into consensus values"""
    
    def __init__(self, db_connection_string: str):
        """Initialize with database connection"""
        self.db_connection_string = db_connection_string
        
    def calculate_fantasy_points(self, df: pl.DataFrame) -> pl.DataFrame:
        """
        Calculate fantasy points for different scoring formats
        """
        # Standard scoring
        df = df.with_columns([
            (
                pl.col("proj_passing_yards").fill_null(0) * 0.04 +
                pl.col("proj_passing_touchdowns").fill_null(0) * 4 +
                pl.col("proj_passing_interceptions").fill_null(0) * -2 +
                pl.col("proj_rushing_yards").fill_null(0) * 0.1 +
                pl.col("proj_rushing_touchdowns").fill_null(0) * 6 +
                pl.col("proj_receiving_yards").fill_null(0) * 0.1 +
                pl.col("proj_receiving_touchdowns").fill_null(0) * 6
            ).alias("fantasy_points_standard")
        ])
        
        # PPR scoring
        df = df.with_columns([
            (
                pl.col("fantasy_points_standard") +
                pl.col("proj_receiving_receptions").fill_null(0) * 1.0
            ).alias("fantasy_points_ppr")
        ])
        
        # Half PPR scoring
        df = df.with_columns([
            (
                pl.col("fantasy_points_standard") +
                pl.col("proj_receiving_receptions").fill_null(0) * 0.5
            ).alias("fantasy_points_half_ppr")
        ])
        
        return df
    
    def bronze_to_silver(self, week: int, season: int):
        """
        Transform bronze raw projections to silver standardized projections
        """
        logger.info(f"Transforming bronze to silver for Week {week}, Season {season}")
        
        conn = psycopg2.connect(self.db_connection_string)
        
        # Read bronze data
        query = """
            SELECT * FROM bronze.raw_projections 
            WHERE week = %s AND season = %s
        """
        df = pd.read_sql(query, conn, params=(week, season))
        
        # Convert to polars for processing
        df_pl = pl.from_pandas(df)
        
        # Calculate fantasy points
        df_pl = self.calculate_fantasy_points(df_pl)
        
        # Standardize player names (ensure consistency)
        df_pl = df_pl.with_columns([
            pl.col("player_name").str.strip_chars().alias("player_name")
        ])
        
        # Add confidence score based on data completeness
        df_pl = df_pl.with_columns([
            pl.when(
                (pl.col("proj_passing_yards").is_not_null()) |
                (pl.col("proj_rushing_yards").is_not_null()) |
                (pl.col("proj_receiving_yards").is_not_null())
            ).then(1.0)
            .otherwise(0.5)
            .alias("confidence_score")
        ])
        
        # Convert back to pandas for database insert
        df_pandas = df_pl.to_pandas()
        
        # Prepare for silver layer insert
        cur = conn.cursor()
        
        # Clear existing silver data for this week
        cur.execute("""
            DELETE FROM silver.player_projections 
            WHERE week = %s AND season = %s
        """, (week, season))
        
        # Insert into silver layer
        insert_query = """
            INSERT INTO silver.player_projections (
                player_name, position, team, week, season, source,
                passing_yards, passing_tds, passing_ints,
                rushing_yards, rushing_tds,
                receiving_yards, receiving_tds, receptions,
                fantasy_points_ppr, fantasy_points_standard, fantasy_points_half_ppr,
                has_props, confidence_score
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = []
        for _, row in df_pandas.iterrows():
            values.append((
                row['player_name'], row.get('position'), row.get('team'),
                week, season, row['source'],
                row.get('proj_passing_yards'), row.get('proj_passing_touchdowns'),
                row.get('proj_passing_interceptions'),
                row.get('proj_rushing_yards'), row.get('proj_rushing_touchdowns'),
                row.get('proj_receiving_yards'), row.get('proj_receiving_touchdowns'),
                row.get('proj_receiving_receptions'),
                row['fantasy_points_ppr'], row['fantasy_points_standard'],
                row['fantasy_points_half_ppr'],
                row['source'] in ['betonline', 'pinnacle'],  # has_props
                row['confidence_score']
            ))
        
        execute_batch(cur, insert_query, values)
        conn.commit()
        
        logger.info(f"Loaded {len(values)} records to silver.player_projections")
        
        cur.close()
        conn.close()
        
    def silver_to_gold(self, week: int, season: int):
        """
        Transform silver standardized projections to gold consensus projections
        """
        logger.info(f"Creating consensus projections for Week {week}, Season {season}")
        
        conn = psycopg2.connect(self.db_connection_string)
        
        # Read silver data - order by source to ensure BetOnline (with position/team) comes first
        query = """
            SELECT * FROM silver.player_projections 
            WHERE week = %s AND season = %s
            ORDER BY source ASC  -- 'betonline' comes before 'pinnacle' alphabetically
        """
        df = pd.read_sql(query, conn, params=(week, season))
        
        if df.empty:
            logger.warning("No silver data found to aggregate")
            return
        
        # Sort to ensure BetOnline data (with position/team) comes first
        df = df.sort_values('source')  # 'betonline' < 'pinnacle' alphabetically
        
        # Filter out rows where fantasy_points_ppr is 0 or null (no real projection)
        # This prevents Pinnacle's empty projections from diluting BetOnline's real data
        df = df[(df['fantasy_points_ppr'] > 0) & df['fantasy_points_ppr'].notna()]
        
        # Group by player and aggregate (don't group by position/team as they may differ between sources)
        agg_df = df.groupby(['player_name', 'week', 'season']).agg({
            'position': 'first',  # Take first value (BetOnline has this, Pinnacle doesn't)
            'team': 'first',  # Take first value (BetOnline has this, Pinnacle doesn't)
            # Consensus values (mean) - only averaging non-zero values now
            'fantasy_points_ppr': ['mean', 'std', 'min', 'max'],
            'fantasy_points_standard': ['mean', 'std', 'min', 'max'],
            'passing_yards': 'mean',
            'passing_tds': 'mean',
            'rushing_yards': 'mean',
            'rushing_tds': 'mean',
            'receiving_yards': 'mean',
            'receiving_tds': 'mean',
            'receptions': 'mean',
            'source': 'count',  # Number of sources with actual projections
            'has_props': 'any'  # Whether any source has props
        }).round(2)
        
        # Flatten column names
        new_columns = []
        for col in agg_df.columns.values:
            if isinstance(col, tuple):
                if col[1]:  # If there's a second part (like 'mean', 'std')
                    new_columns.append('_'.join(col).strip())
                else:  # If it's just a single column (like position, team)
                    new_columns.append(col[0])
            else:
                new_columns.append(col)
        agg_df.columns = new_columns
        agg_df = agg_df.reset_index()
        
        # Calculate confidence rating based on number of sources and std deviation
        def calculate_confidence(row):
            num_sources = row['source_count']
            std_dev = row.get('fantasy_points_ppr_std', 0)
            
            if num_sources >= 2 and std_dev < 2:
                return 'HIGH'
            elif num_sources >= 2 or std_dev < 4:
                return 'MEDIUM'
            else:
                return 'LOW'
        
        agg_df['confidence_rating'] = agg_df.apply(calculate_confidence, axis=1)
        
        # Get individual source projections
        source_pivots = df.pivot_table(
            index=['player_name', 'week', 'season'],
            columns='source',
            values='fantasy_points_ppr',
            aggfunc='mean'
        ).reset_index()
        
        # Merge with aggregated data
        final_df = agg_df.merge(
            source_pivots,
            on=['player_name', 'week', 'season'],
            how='left'
        )
        
        # Debug: Check if we have position/team data
        logger.info(f"Sample of final_df columns: {final_df.columns.tolist()[:10]}")
        sample_players = final_df[final_df['source_count'] > 1].head(3)
        for _, row in sample_players.iterrows():
            logger.info(f"Player: {row['player_name']}, Position: {row.get('position_first')}, Team: {row.get('team_first')}")
        
        # Prepare for gold layer insert
        cur = conn.cursor()
        
        # Clear existing gold data for this week
        cur.execute("""
            DELETE FROM gold.consensus_projections 
            WHERE week = %s AND season = %s
        """, (week, season))
        
        # Insert into gold layer
        insert_query = """
            INSERT INTO gold.consensus_projections (
                player_name, position, team, week, season,
                consensus_points_ppr, consensus_points_standard,
                floor_points_ppr, ceiling_points_ppr,
                betonline_proj, pinnacle_proj,
                proj_passing_yards, proj_passing_tds,
                proj_rushing_yards, proj_rushing_tds,
                proj_receiving_yards, proj_receiving_tds, proj_receptions,
                num_sources, projection_std_dev, confidence_rating, has_props
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = []
        for _, row in final_df.iterrows():
            values.append((
                row['player_name'], row.get('position_first'), row.get('team_first'),
                week, season,
                row.get('fantasy_points_ppr_mean', 0),
                row.get('fantasy_points_standard_mean', 0),
                row.get('fantasy_points_ppr_min', 0),  # floor
                row.get('fantasy_points_ppr_max', 0),  # ceiling
                row.get('betonline'),
                row.get('pinnacle'),
                row.get('passing_yards_mean'),
                row.get('passing_tds_mean'),
                row.get('rushing_yards_mean'),
                row.get('rushing_tds_mean'),
                row.get('receiving_yards_mean'),
                row.get('receiving_tds_mean'),
                row.get('receptions_mean'),
                int(row.get('source_count', 0)),
                row.get('fantasy_points_ppr_std'),
                row.get('confidence_rating', 'LOW'),
                bool(row.get('has_props_any', False))
            ))
        
        execute_batch(cur, insert_query, values)
        conn.commit()
        
        logger.info(f"Loaded {len(values)} consensus projections to gold layer")
        
        cur.close()
        conn.close()
    
    def run_full_pipeline(self, week: int, season: int):
        """
        Run the complete pipeline: bronze → silver → gold
        """
        logger.info(f"Running full pipeline for Week {week}, Season {season}")
        
        # Step 1: Bronze to Silver
        self.bronze_to_silver(week, season)
        
        # Step 2: Silver to Gold
        self.silver_to_gold(week, season)
        
        logger.info("Pipeline complete!")
        
        # Print summary
        self.print_summary(week, season)
    
    def print_summary(self, week: int, season: int):
        """
        Print a summary of the consensus projections
        """
        conn = psycopg2.connect(self.db_connection_string)
        cur = conn.cursor()
        
        # Get top players by consensus PPR points
        cur.execute("""
            SELECT 
                player_name, position, 
                ROUND(consensus_points_ppr::numeric, 1) as ppr_points,
                ROUND(floor_points_ppr::numeric, 1) as floor,
                ROUND(ceiling_points_ppr::numeric, 1) as ceiling,
                num_sources,
                confidence_rating
            FROM gold.consensus_projections
            WHERE week = %s AND season = %s
            ORDER BY consensus_points_ppr DESC
            LIMIT 10
        """, (week, season))
        
        print(f"\n{'='*80}")
        print(f"Top 10 Players - Week {week} Consensus Projections")
        print(f"{'='*80}")
        print(f"{'Player':<25} {'Pos':<5} {'PPR':<8} {'Floor':<8} {'Ceiling':<8} {'Sources':<8} {'Confidence':<10}")
        print(f"{'-'*80}")
        
        for row in cur.fetchall():
            position = row[1] if row[1] else "N/A"
            print(f"{row[0][:24]:<25} {position:<5} {row[2]:<8} {row[3]:<8} {row[4]:<8} {row[5]:<8} {row[6]:<10}")
        
        cur.close()
        conn.close()


if __name__ == "__main__":
    # Example usage
    connection_string = (
        "postgresql://app_user:secure_password_change_me@localhost:5432/fantasy_football"
    )
    
    aggregator = ConsensusAggregator(connection_string)
    
    # Run the full pipeline for Week 1, 2025
    aggregator.run_full_pipeline(week=1, season=2025)
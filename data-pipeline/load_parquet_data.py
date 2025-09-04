"""
Load the actual BetOnline and Pinnacle parquet files into the database
"""
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_batch
import sys
sys.path.append('../tmp')
from sample_cleaning import clean_pinny, clean_bol

# Database connection
conn = psycopg2.connect(
    "postgresql://app_user:secure_password_change_me@localhost:5432/fantasy_football"
)
cur = conn.cursor()

print("Loading BetOnline data...")
# Load and process BetOnline data
bol_df = pd.read_parquet("../tmp/BetOnline_AllProps_Week_1.parquet")
print(f"BetOnline shape: {bol_df.shape}")
print(f"BetOnline columns: {bol_df.columns.tolist()}")

# Clean column names - convert camelCase to snake_case
bol_df.columns = bol_df.columns.str.replace('proj_', '').str.replace(
    r'([A-Z])', r'_\1', regex=True
).str.lower().str.strip('_')

# Rename to match database schema
column_mapping = {
    'passing_yards': 'proj_passing_yards',
    'passing_completions': 'proj_passing_completions', 
    'passing_touchdowns': 'proj_passing_touchdowns',
    'passing_attempts': 'proj_passing_attempts',
    'passing_interceptions': 'proj_passing_interceptions',
    'rushing_yards': 'proj_rushing_yards',
    'rushing_attempts': 'proj_rushing_attempts',
    'rushing_touchdowns': 'proj_rushing_touchdowns',
    'receiving_yards': 'proj_receiving_yards',
    'receiving_receptions': 'proj_receiving_receptions',
    'receiving_touchdowns': 'proj_receiving_touchdowns',
}
bol_df = bol_df.rename(columns=column_mapping)

# Add source column
bol_df['source'] = 'betonline'
bol_df['season'] = 2025

# Replace NaN with None for database
bol_df = bol_df.replace({np.nan: None})

print("\nLoading Pinnacle data...")
# Clean Pinnacle data using the provided cleaning function
pinny_df = clean_pinny("../tmp/Pinnacle_Props_Week_1.parquet")
print(f"Pinnacle shape: {pinny_df.shape}")
print(f"Pinnacle columns: {pinny_df.columns.tolist()}")

# Ensure Pinnacle has the right column names
pinny_df['source'] = 'pinnacle'
pinny_df['season'] = 2025

# Pinnacle doesn't have position/team, set to None
if 'position' not in pinny_df.columns:
    pinny_df['position'] = None
if 'team' not in pinny_df.columns:
    pinny_df['team'] = None

# Replace NaN with None
pinny_df = pinny_df.replace({np.nan: None})

# Clear existing data
print("\nClearing existing data...")
cur.execute("DELETE FROM bronze.raw_projections WHERE season = 2025")

# Insert BetOnline data
print("\nInserting BetOnline data...")
bol_values = []
for _, row in bol_df.iterrows():
    bol_values.append((
        'betonline',  # source
        row.get('week', 1),
        2025,  # season
        row['player_name'],
        row.get('position'),
        row.get('team'),
        row.get('proj_passing_yards'),
        row.get('proj_passing_touchdowns'),
        row.get('proj_passing_interceptions'),
        row.get('proj_passing_completions'),
        row.get('proj_passing_attempts'),
        row.get('proj_rushing_yards'),
        row.get('proj_rushing_touchdowns'),
        row.get('proj_rushing_attempts'),
        row.get('proj_receiving_yards'),
        row.get('proj_receiving_touchdowns'),
        row.get('proj_receiving_receptions'),
        None,  # proj_defensive_sacks
        None,  # proj_defensive_interceptions
        None,  # proj_defensive_total_tackles
    ))

insert_query = """
INSERT INTO bronze.raw_projections (
    source, week, season, player_name, position, team,
    proj_passing_yards, proj_passing_touchdowns, proj_passing_interceptions,
    proj_passing_completions, proj_passing_attempts,
    proj_rushing_yards, proj_rushing_touchdowns, proj_rushing_attempts,
    proj_receiving_yards, proj_receiving_touchdowns, proj_receiving_receptions,
    proj_defensive_sacks, proj_defensive_interceptions, proj_defensive_total_tackles
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

execute_batch(cur, insert_query, bol_values)
print(f"Inserted {len(bol_values)} BetOnline records")

# Insert Pinnacle data
print("\nInserting Pinnacle data...")
pinny_values = []
for _, row in pinny_df.iterrows():
    pinny_values.append((
        'pinnacle',  # source
        row.get('week', 1),
        2025,  # season
        row['player_name'],
        None,  # position
        None,  # team
        row.get('proj_passing_yards'),
        row.get('proj_passing_touchdowns'),
        row.get('proj_passing_interceptions'),
        row.get('proj_passing_completions'),
        row.get('proj_passing_attempts'),
        row.get('proj_rushing_yards'),
        row.get('proj_rushing_touchdowns'),
        row.get('proj_rushing_attempts'),
        row.get('proj_receiving_yards'),
        row.get('proj_receiving_touchdowns'),
        row.get('proj_receiving_receptions'),
        None,  # proj_defensive_sacks
        None,  # proj_defensive_interceptions
        None,  # proj_defensive_total_tackles
    ))

execute_batch(cur, insert_query, pinny_values)
print(f"Inserted {len(pinny_values)} Pinnacle records")

conn.commit()

# Verify the data
cur.execute("""
    SELECT source, COUNT(*) as count, 
           COUNT(DISTINCT player_name) as unique_players,
           COUNT(position) as with_position
    FROM bronze.raw_projections 
    WHERE season = 2025
    GROUP BY source
""")

print("\n=== Data Summary ===")
for row in cur.fetchall():
    print(f"{row[0]}: {row[1]} records, {row[2]} unique players, {row[3]} with position")

cur.close()
conn.close()

print("\nData loaded successfully!")
print("\nNow run the consensus aggregator to process bronze → silver → gold:")
print("  cd data-pipeline && uv run python transformers/consensus_aggregator.py")
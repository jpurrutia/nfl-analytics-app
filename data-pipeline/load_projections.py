#!/usr/bin/env python3
"""
Load projections data into PostgreSQL using the ProjectionsExtractor
"""
import sys
import os
from pathlib import Path

# Add parent directory to path to import extractors
sys.path.insert(0, str(Path(__file__).parent))

# Now we can import our extractor
from extractors.projections_extractor import ProjectionsExtractor

def main():
    # Database connection to Docker PostgreSQL
    connection_string = (
        "postgresql://app_user:secure_password_change_me@localhost:5432/fantasy_football"
    )
    
    # Initialize extractor
    extractor = ProjectionsExtractor(connection_string)
    
    # Process Week 1 data
    print("Loading Week 1 projections...")
    extractor.extract_and_load(
        betonline_path="../tmp/BetOnline_AllProps_Week_1.parquet",
        pinnacle_path="../tmp/Pinnacle_Props_Week_1.parquet",
        season=2025,
        week=1
    )
    
    print("✅ Projections loaded successfully!")

if __name__ == "__main__":
    main()
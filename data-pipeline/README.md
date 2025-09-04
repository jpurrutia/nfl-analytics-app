# NFL Data Pipeline

Python-based data pipeline for NFL analytics platform.

## Features

- NFL data extraction from nflverse
- Fantasy points calculation (Standard, PPR, Half-PPR)
- Advanced analytics metrics (consistency, boom/bust, target share, red zone)
- DuckDB-based medallion architecture (Bronze → Silver → Gold)
- Data transformation and aggregation

## Setup

```bash
# Create virtual environment
uv venv

# Activate environment
source .venv/bin/activate

# Install dependencies
uv pip install -e ".[dev]"
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov
```

## Usage

See `orchestration/` directory for pipeline scripts.
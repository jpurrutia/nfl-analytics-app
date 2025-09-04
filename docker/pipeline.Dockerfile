# Data Pipeline Dockerfile - Python ETL
FROM python:3.11-slim AS development

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements file
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create data directory for DuckDB
RUN mkdir -p /data

# Default command for development
CMD ["python", "-u", "orchestration/daily_update.py"]

# Production stage
FROM python:3.11-slim AS production

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data

# Run as non-root user in production
RUN useradd -m -u 1000 pipeline && chown -R pipeline:pipeline /app /data
USER pipeline

CMD ["python", "-u", "orchestration/daily_update.py"]
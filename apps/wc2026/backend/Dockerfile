FROM python:3.12-slim

WORKDIR /app

# OS deps for psycopg2 / cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Seed spreadsheet shipped in the image so first-boot has data.
RUN mkdir -p /app/seed && \
    if [ -f "World_Cup_2026_Wall_Chart.xlsx" ]; then \
        cp World_Cup_2026_Wall_Chart.xlsx /app/seed/; \
    fi

EXPOSE 9002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9002"]



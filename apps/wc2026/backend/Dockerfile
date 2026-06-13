FROM python:3.12-slim

WORKDIR /app

# OS deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code + curated squads spreadsheet (ESPN doesn't expose squads, so we
# ship the .xlsx in the image).
COPY . .

EXPOSE 9002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9002"]


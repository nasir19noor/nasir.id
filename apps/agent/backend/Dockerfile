FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9003

# --network host is used at run time, so uvicorn binds the VPS port directly.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9003"]



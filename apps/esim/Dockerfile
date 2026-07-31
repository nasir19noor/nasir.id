FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY templates/ templates/
COPY static/ static/

# Quiz banks + selector (bank/config.json picks the active .docx).
# Overridable via volume mount without a rebuild.
COPY bank/ bank/

EXPOSE 6000

# No QUIZ_DOCX default — the active bank is chosen by bank/config.json.
# Set QUIZ_DOCX here only to force a specific file regardless of config.

CMD ["gunicorn", "--workers=1", "--bind=0.0.0.0:6000", "--timeout=120", "app:app"]



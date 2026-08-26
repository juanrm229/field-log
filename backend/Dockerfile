# Backend image for Cloud Run (or any container host).
# Build from the repo root:  docker build -t field-log-api backend/
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copied first so the dependency layer survives code-only changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run injects PORT and expects the server bound to 0.0.0.0. The default
# keeps a plain `docker run` working without passing anything.
ENV PORT=8080
EXPOSE 8080

CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT}

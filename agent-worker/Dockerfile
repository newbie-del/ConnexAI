# LiveKit agent worker — a long-running process, NOT serverless.
# It holds an open connection to LiveKit and joins meeting rooms on dispatch,
# so it cannot run on Vercel. Deploy this image to Railway / Render / Fly.io.

FROM python:3.12-slim

# Audio processing in livekit-agents needs these at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first so Docker caches the dependency layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .

# Pre-download the turn-detection / VAD model weights at build time. Without
# this the first meeting pays the download cost and can miss the join window.
RUN python agent.py download-files || true

# "start" is production mode; "dev" enables hot-reload and is for local use.
CMD ["python", "agent.py", "start"]

FROM node:18-slim

# Install system dependencies for node-canvas and FFmpeg
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p src/dolix-yt/angreziPitaraYTShortAutomatio/temp
RUN mkdir -p src/dolix-yt/angreziPitaraYTShortAutomatio/videos

# Expose the health check port
EXPOSE 10000

CMD ["npm", "start"]

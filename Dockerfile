# Use the official Microsoft Playwright image matching our Playwright version (v1.50.1)
# Contains Ubuntu 24.04 (Noble), Node.js, and pre-installed browser binaries with all OS dependencies
FROM mcr.microsoft.com/playwright:v1.50.1-noble

# Set working directory inside container
WORKDIR /app

# Copy package manifests for efficient Docker layer caching
COPY package*.json ./

# Install project dependencies cleanly
RUN npm ci

# Copy configuration and source files
COPY scoobies.config.js ./
COPY src/ ./src/

# Ensure report output directories exist
RUN mkdir -p reports/screenshots

# Configure runtime environment
ENV NODE_ENV=production \
    CI=true

# Default execution: run the full QA and performance auditing suite
CMD ["node", "src/runner.js"]

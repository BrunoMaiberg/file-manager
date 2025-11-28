# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install ffmpeg for video thumbnail generation
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8181

# Start the application
CMD ["npm", "start"]

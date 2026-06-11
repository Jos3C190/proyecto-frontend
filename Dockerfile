FROM node:20-slim

WORKDIR /app

# Copy package management files
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy application files
COPY . .

# Expose Vite default dev server port
EXPOSE 5173

# Run Vite dev server bound to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

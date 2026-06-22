FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (dev deps required for Vite dev server)
RUN npm install

# Copy the rest of the source
COPY . .

# Expose the port Vite will use
EXPOSE 8080

# Run the Vite dev server directly; useful when type-checking fails
# but we still want a working UI for light traffic.
ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

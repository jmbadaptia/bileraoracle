# ---- Dependencies ----
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y python3 make g++ libc6-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- Development ----
FROM node:20-slim AS dev
RUN apt-get update && apt-get install -y libaio1 libvips-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---- Production ----
FROM node:20-slim AS prod
RUN apt-get update && apt-get install -y libaio1 libvips-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]

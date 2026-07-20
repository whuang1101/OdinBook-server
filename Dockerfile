FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ENV NODE_ENV=production
ENV BUILD_SHA=$BUILD_SHA
ENV BUILD_TIME=$BUILD_TIME
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
LABEL org.opencontainers.image.revision=$BUILD_SHA
EXPOSE 3000
CMD ["node", "index.js"]

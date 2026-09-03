FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY app.js config.js server.js ./
COPY routes ./routes
COPY services ./services
COPY utils ./utils

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]

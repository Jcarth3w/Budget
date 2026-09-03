FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty = browser calls /budget and /transaction on the same host (nginx proxy).
ARG EXPO_PUBLIC_BUDGET_API_URL=
ENV EXPO_PUBLIC_BUDGET_API_URL=$EXPO_PUBLIC_BUDGET_API_URL

RUN npx expo export -p web

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

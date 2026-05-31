FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_CAMPAIGN_API_URL=/api
ARG VITE_DISPATCH_API_URL=/dispatch-api
ENV VITE_CAMPAIGN_API_URL=$VITE_CAMPAIGN_API_URL
ENV VITE_DISPATCH_API_URL=$VITE_DISPATCH_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

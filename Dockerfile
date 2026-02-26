# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --workspace=react-ai
RUN npm run demo:scan
RUN npm run build --workspace=webapp

# Stage 2: Lean production image (no devDeps, no source maps, etc.)
FROM node:20-alpine AS final
RUN apk add --no-cache nginx
WORKDIR /app

# Static webapp
COPY --from=builder /app/demo/webapp/dist /usr/share/nginx/html

# All workspace source (no node_modules — will reinstall prod-only below)
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/demo/server ./demo/server/
COPY --from=builder /app/react-ai ./react-ai/
COPY --from=builder /app/core/package*.json ./core/
COPY --from=builder /app/core/src/generated ./core/src/generated/

# Stub out unused workspace packages so npm install doesn't complain
COPY --from=builder /app/demo/webapp/package.json ./demo/webapp/
COPY --from=builder /app/scanner/package.json ./scanner/
COPY --from=builder /app/sdk/package.json ./sdk/
COPY --from=builder /app/bridge/package.json ./bridge/
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/types/package.json ./types/

RUN npm install --omit=dev

COPY nginx.conf /etc/nginx/http.d/default.conf
COPY start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 8080
CMD ["./start.sh"]

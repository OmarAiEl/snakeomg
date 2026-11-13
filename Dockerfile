FROM node:24-bookworm-slim
WORKDIR /app
COPY portable/ ./
ENV HOST=0.0.0.0 PORT=10000
EXPOSE 10000
CMD ["sh", "-c", "export PUBLIC_ORIGIN=\"${PUBLIC_ORIGIN:-${RENDER_EXTERNAL_URL:-http://localhost:$PORT}}\"; exec node server.mjs"]

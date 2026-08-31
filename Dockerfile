# JLPT Learning App - Dockerfile for QNAP Container Station
# 使用 nginx 作为静态文件服务器，轻量且稳定

FROM nginx:alpine

# 复制应用文件到 nginx 默认目录
COPY index.html /usr/share/nginx/html/
COPY main.js /usr/share/nginx/html/
COPY manifest.json /usr/share/nginx/html/
COPY components/ /usr/share/nginx/html/components/
COPY japanese-assets/ /usr/share/nginx/html/japanese-assets/
COPY japanese-data/ /usr/share/nginx/html/japanese-data/

# 自定义 nginx 配置，确保 JSON 文件 MIME 类型正确
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # 确保 JSON 文件 MIME 类型正确 \
    location ~* \.json$ { \
        add_header Content-Type application/json; \
        add_header Access-Control-Allow-Origin *; \
    } \
    \
    # 静态文件缓存 \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 7d; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # SPA 回退（hash 路由不需要，但保留备用） \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

# Frontend — served by Nginx (static files)
FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

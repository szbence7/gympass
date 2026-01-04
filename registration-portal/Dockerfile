# Simple nginx server for static registration portal
FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


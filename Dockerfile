# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Run the production build
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:stable-alpine

# Copy the built Angular app from the build stage
# Note: With the @angular-devkit/build-angular:application builder, 
# the static files are output to dist/project_name/browser
COPY --from=build /app/dist/front_fil_rouge/browser /usr/share/nginx/html

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Basic security: Run as non-root user (optional but recommended)
# Note: nginx:stable-alpine already has an nginx user, but to bind port 80 it needs root privileges initially,
# or we can use port 8080. We will stick to port 80 as requested and rely on standard Nginx worker isolation.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

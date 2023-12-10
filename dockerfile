# Start your image with a node base image
FROM node:18-alpine

# The /app directory should act as the main application directory
WORKDIR /app

# Copy the app package and package-lock.json file
COPY package*.json ./

# Copy local directories to the current local directory of our docker image (/app)
COPY . .

# Install node packages, install serve, build the app, and remove dependencies at the end
RUN npm install
# for production
# RUN npm run build
RUN npm run seed

EXPOSE 3080

# Start the app using serve command
# for production
# CMD npm run start
CMD npm run dev

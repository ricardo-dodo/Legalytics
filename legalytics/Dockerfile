# Use Node.js 14 as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY ./package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY ./ /app/

# Build the Next.js application
RUN npm run build

# Expose the port that your Next.js app will run on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]

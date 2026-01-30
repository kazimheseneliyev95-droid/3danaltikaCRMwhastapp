# Use a Node image that includes the necessary libraries for Chrome
FROM node:18-slim

# Install latest chrome dev package and fonts to support major charsets
# This is required for Puppeteer to run on Render
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set the Puppeteer executable path to the installed Chrome
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome-stable"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port Render will use
EXPOSE 3001

# Start the server
CMD [ "node", "index.js" ]

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

RUN npm install -g pm2

EXPOSE 5000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]

FROM node:16-alpine
RUN apk update && apk add tzdata git openssh
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime
RUN echo "Europe/Moscow" > /etc/timezone
RUN date
RUN mkdir -p /usr/nodejs
WORKDIR /usr/nodejs
COPY package.json /usr/nodejs
COPY Start.js /usr/nodejs
RUN npm install
CMD ["npm", "start"]
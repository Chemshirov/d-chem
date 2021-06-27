FROM node:alpine
RUN apk add --no-cache libc6-compat
RUN apk add tzdata
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime
RUN echo "Europe/Moscow" > /etc/timezone
RUN date
RUN npm i -g npm && npm -v 
WORKDIR /usr/nodejs
COPY *.json /usr/nodejs/
RUN npm install --no-optional
RUN npx next telemetry disable
COPY Start.js /usr/nodejs
CMD [ "npm", "start" ]
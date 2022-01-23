FROM node:16-alpine
RUN apk add --no-cache libc6-compat
RUN apk add tzdata
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime
RUN echo "Europe/Moscow" > /etc/timezone
ENV LC_ALL="eng_DK.utf8"
RUN npm i -g npm && npm -v
WORKDIR /usr/nodejs
COPY *.json /usr/nodejs/
RUN npm install --no-optional
RUN npx next telemetry disable
RUN npm install -D @swc/cli @swc/core
COPY Start.js /usr/nodejs
CMD [ "npm", "start" ]
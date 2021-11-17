FROM node:16-alpine
RUN apk update
RUN apk add --no-cache libc6-compat
RUN apk add tzdata
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime
RUN echo "Europe/Moscow" > /etc/timezone
ENV LC_ALL="eng_DK.utf8"
RUN npm i -g npm
WORKDIR /usr/nodejs
COPY *.json /usr/nodejs/
RUN npm install --no-optional
RUN npm install -g typescript
RUN npx next telemetry disable
COPY *.ts /usr/nodejs/
RUN tsc --target ES2020 --moduleResolution Node --module CommonJS start.ts
CMD [ "npm", "start" ]
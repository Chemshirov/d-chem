FROM node:16-stretch-slim
RUN apt-get update && apt-get install tzdata
ENV TZ "Europe/Moscow"
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime
RUN echo $TZ > /etc/timezone
ENV LC_ALL="eng_DK.utf8"
RUN mkdir -p /usr/nodejs
WORKDIR /usr/nodejs
COPY package.json /usr/nodejs
COPY Start.js /usr/nodejs
RUN npm install
CMD ["npm", "start"]
FROM node:16-alpine
RUN apk add tzdata openssh rsync
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime
RUN echo "Europe/Moscow" > /etc/timezone
ENV LC_ALL="eng_DK.utf8"
RUN mkdir -p /usr/nodejs
WORKDIR /usr/nodejs
COPY package.json /usr/nodejs
COPY Start.js /usr/nodejs
RUN npm install
CMD ["npm", "start", "/usr/sbin/sshd"] 
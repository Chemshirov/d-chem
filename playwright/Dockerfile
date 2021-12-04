FROM mcr.microsoft.com/playwright:focal
ENV TZ=Europe/Moscow
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get install -y xvfb
RUN npm install -g npm
ARG NV=16.13.0
RUN curl https://nodejs.org/dist/v$NV/node-v$NV-linux-x64.tar.gz | tar -xz -C /usr/local --strip-components 1
ENV WORKDIR=/usr/nodejs
WORKDIR $WORKDIR
COPY *.json $WORKDIR/
RUN npm install -g typescript
RUN npm install --save-dev @types/node
COPY *.ts $WORKDIR/
RUN tsc --target ES2020 --moduleResolution Node --module CommonJS start.ts
CMD [ "npm", "start" ]
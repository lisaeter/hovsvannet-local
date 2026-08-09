FROM node:latest

RUN apt-get update \
    && apt-get install --yes digitemp

WORKDIR /rock4cplus

COPY package.json package-lock.json logger.js ./

RUN npm i

RUN digitemp_DS9097 -i -s /dev/ttyUSB0

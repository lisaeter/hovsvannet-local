FROM node:latest

RUN apt-get update \
    && apt-get install --yes digitemp

WORKDIR /rock4cplus

COPY package.json package-lock.json logger.js .digitemprc .env ./

RUN npm i

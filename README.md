# Hovsvannet
## About
This is a simple project which only uses nginx as a http server to serve static files in frontend.

## Usage
To run the website and logger for **development**, first install docker-compose, then run the following command:
```
docker compose up -d
```
To run only the website locally for **development** run (this runs only the nginx container):
```
docker compose up nginx -d
```
To run everything for **production** run:
```
docker compose -f compose.yaml -f compose.prod.yaml up -d
```
The cloudflared container uses an api key in the environment variable "CLOUDFLARE_TUNNEL_TOKEN". An easy option is to create a file named ".env" in the root folder and add `CLOUDFLARE_TUNNEL_TOKEN=replace-with-token`

When running **production**, you should in general use:
```
docker compose -f compose.yaml -f compose.prod.yaml <command>
```
when running compose commands, for example ps to list containers.

(Not recommended) A simple way to test index.html WITHOUT A BACKEND is to disable CORS and open the file directly in the browser:
```
chromium --disable-web-security --user-data-dir="/home/main/Code/temp-chromium-dir/"
```
Also location of db changes in nginx container, so you may need to change some imports.

When testing with backend, remember to maybe hard refresh site to clear cache

----------
## SSH
Run `ssh -F ssh-config ssh.hovsvannet.com`

More information at [cloudflare docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/)

# Hovsvannet
This is a simple project which only uses nginx as a http server to serve static files in frontend.
To run the website, first install docker-compose, then run the following command:
```
docker compose up -d
```
A simple way to test index.html WITHOUT A BACKEND is to disable CORS and open the file directly in the browser:
```
chromium --disable-web-security --user-data-dir="/home/main/Code/temp-chromium-dir/"
```
When testing with backend, remember to hard refresh site to clear cache

----------
The cloudflared container uses an api key in the environment variable "CLOUDFLARE_TUNNEL_TOKEN". An easy way is to create a file named ".env" in the root folder and add `CLOUDFLARE_TUNNEL_TOKEN=replace-with-token`

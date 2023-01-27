# denon-vtuner
Private proxy to access vtuner internet radio list

My Denon receiver supports browsing the internet radio catalog of vtuner.com. Initially this service was accessible without extra costs, now the service costs five euros a year. But the website is still accessible without account.

This repo contains a local node.js server that can load the html pages from the web site and return the categories and stations in the xml format that the Denon receiver understands.

## My setup
I have a Raspberry Pi that runs Pi-hole DNS. Hostname denon.vtuner.com is linked to the internal IP address of the RPi.

The RPi runs nginx to host the denon.vtuner.com website:
```
server {
        listen 192.168.1.2:80;
        server_name denon.vtuner.com;
        index index.html;
        location / {
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $host;
                proxy_pass http://127.0.0.1:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
        }
}
```
On local port 3000, it runs the node.js server.

The server script first has a list of request urls with either a static response or a function that will generate the response. The static responses are for the startup (authentication sequence that is ignored) and the start page. For the generated responses, the script analyses the pages of the vtuner.com web site and returns the inner groups with list of stations, or a redirect to the stream url.

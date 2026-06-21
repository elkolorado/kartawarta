# Production deployment

This guide deploys Kartawarta to a Debian VPS that already has Docker installed, with `kartawarta.pl` served through host nginx + HTTPS.

## Target shape

```text
Internet
  -> kartawarta.pl DNS
  -> VPS nginx on ports 80/443
  -> 127.0.0.1:8081 frontend container
  -> Docker internal network
       frontend nginx -> backend:8000
       frontend nginx -> vision:8002
       backend -> sqlserver:1433
```

Only host nginx should be public. SQL Server, backend, vision, Prometheus, cAdvisor, docker-stats-exporter, and Grafana must not be exposed to the internet.

## 1. DNS

Create DNS records:

```text
A      kartawarta.pl       YOUR_VPS_IP
A      www.kartawarta.pl   YOUR_VPS_IP
```

Check from your machine:

```bash
ping kartawarta.pl
```

## 2. VPS packages

On the Debian VPS:

```bash
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx ufw fail2ban unattended-upgrades
```

Check Docker:

```bash
docker --version
docker compose version
```

## 3. Firewall

Allow only SSH, HTTP, and HTTPS publicly:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

Docker can create its own iptables rules for published ports. This is why production Compose must bind app ports to `127.0.0.1` or remove them entirely. Do not rely only on UFW if a Docker service publishes `0.0.0.0:PORT`.

Do not open these ports publicly in production:

```text
1433  SQL Server
8000  backend
8002  vision
8081  frontend container direct access
8082  cAdvisor
9090  Prometheus
9100  docker-stats-exporter
3001  Grafana
```

## 4. VPS security baseline

Do these steps before exposing the app publicly.

### Create a non-root deploy user

If your VPS only has `root`, create a normal user:

```bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
```

Log out and reconnect as `deploy`. Avoid daily work as `root`.

### SSH key login

From your local machine, copy your SSH key:

```bash
ssh-copy-id deploy@YOUR_VPS_IP
```

Confirm you can log in without password:

```bash
ssh deploy@YOUR_VPS_IP
```

Only after key login works, harden SSH:

```bash
sudo nano /etc/ssh/sshd_config
```

Recommended settings:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
KbdInteractiveAuthentication no
X11Forwarding no
AllowUsers deploy
```

Validate and reload SSH:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

Keep your current SSH session open and test a second login before closing it.

### Fail2ban

Install was done in the package step. Create a local jail config:

```bash
sudo nano /etc/fail2ban/jail.local
```

Use:

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
```

Enable it:

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

If you changed SSH to a custom port, update both UFW and `port = ...` in the fail2ban jail.

### Automatic security updates

Enable unattended security updates:

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Check status:

```bash
systemctl status unattended-upgrades --no-pager
```

### Nginx basic hardening

Hide nginx version:

```bash
sudo nano /etc/nginx/nginx.conf
```

Inside the `http { ... }` block, ensure:

```nginx
server_tokens off;
```

Then validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Docker permissions warning

Users in the `docker` group effectively have root-level control of the host. Only add trusted deploy users to this group.

### Public exposure checks

From the VPS:

```bash
sudo ss -lntp
```

Expected public listeners:

```text
:22   SSH, or your custom SSH port
:80   nginx
:443  nginx
```

These should either not appear, or only bind to `127.0.0.1`:

```text
127.0.0.1:8081  frontend container
127.0.0.1:3001  Grafana, only if private monitoring is running
```

From your local machine, check externally:

```bash
nmap -Pn YOUR_VPS_IP
```

Expected open ports should be only SSH, HTTP, and HTTPS.

## 5. Clone repository

```bash
cd /opt
sudo git clone https://github.com/elkolorado/kartawarta.git
sudo chown -R $USER:$USER /opt/kartawarta
cd /opt/kartawarta
git checkout google
git pull
git submodule update --init --recursive
```

## 6. Create production `.env`

Create the file only on the VPS:

```bash
nano .env
```

Example:

```env
DB_USER=sa
DB_PASSWORD=PUT_LONG_RANDOM_SQL_PASSWORD_HERE
DB_DATABASE=cardmarket
JWT_SECRET_KEY=PUT_LONG_RANDOM_JWT_SECRET_HERE

APP_ENV=docker

GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
GOOGLE_WEB_REDIRECT_URI=https://kartawarta.pl/login

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=PUT_LONG_RANDOM_GRAFANA_PASSWORD_HERE
```

Generate strong secrets:

```bash
openssl rand -base64 48
```

Important:

- never commit `.env`
- use a strong SQL Server password, otherwise SQL Server will not start
- use a long random `JWT_SECRET_KEY`
- do not reuse the Grafana password anywhere else

## 7. Google OAuth

In Google Cloud Console, add production redirect URIs for the web client:

```text
https://kartawarta.pl/login
https://www.kartawarta.pl/login
```

If Google Cloud only has `http://localhost:8081/login`, production login will fail with `redirect_uri_mismatch`.

## 8. Production Docker ports

Use `docker-compose.prod.yml` in production. It disables public ports for SQL Server, backend, and vision, and binds frontend only to localhost:

```yaml
frontend:
  ports:
    - "127.0.0.1:8081:80"
```

Start the app:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

For the small 2 vCore / 4 GB VPS profile:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.vps-2vcpu-4gb.yml up -d --build
```

## 9. Host nginx

Create nginx site:

```bash
sudo nano /etc/nginx/sites-available/kartawarta.pl
```

Use this config before Certbot:

```nginx
server {
    listen 80;
    server_name kartawarta.pl www.kartawarta.pl;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/kartawarta.pl /etc/nginx/sites-enabled/kartawarta.pl
sudo nginx -t
sudo systemctl reload nginx
```

## 10. HTTPS certificate

After DNS points to the VPS:

```bash
sudo certbot --nginx -d kartawarta.pl -d www.kartawarta.pl
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

## 11. Start / update production

Normal production:

```bash
cd /opt/kartawarta
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Small VPS profile:

```bash
cd /opt/kartawarta
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.vps-2vcpu-4gb.yml up -d --build
```

Check status:

```bash
docker ps
docker logs kartawarta-backend --tail 100
docker logs kartawarta-vision --tail 100
docker logs kartawarta-frontend --tail 100
```

## Card Images and Indexes
On local machine
`tar -czf assets.tar.gz card_images indexes`
Copy 
`scp assets.tar.gz kartawarta:/opt/kartawarta/`
```
# 1. Connect to your server
ssh kartawarta

# 2. Go to your project directory
cd /opt/kartawarta

# 3. Unzip the assets (this extracts card_images/ and indexes/ right here)
tar -xzf assets.tar.gz

# 4. Delete the zip file from the server to save space
rm assets.tar.gz
```


## Catalog tables from local SQL Server

If Cardmarket blocks the VPS but works locally, run ingestion locally and then copy only the catalog tables to production:

- `TCG`
- `Expansion`
- `Card`

This keeps production user data and collections intact because it does not replace the whole database.

Prerequisites:

- local Docker SQL container is running (`kartawarta-sqlserver` by default)
- VPS Docker SQL container is running (`kartawarta-sqlserver` by default)
- SSH alias `kartawarta` points to the VPS, or set `REMOTE_HOST`
- local and remote SQL `sa` passwords are available

On your local machine, after local ingestion succeeds:

```bash
DB_PASSWORD='LOCAL_SQL_PASSWORD' \
REMOTE_DB_PASSWORD='VPS_SQL_PASSWORD' \
bash scripts/sync_catalog_tables.sh all
```

If both SQL Server containers use the same password, `REMOTE_DB_PASSWORD` can be omitted:

```bash
DB_PASSWORD='SQL_PASSWORD' bash scripts/sync_catalog_tables.sh all
```

Useful overrides:

```bash
REMOTE_HOST=deploy@YOUR_VPS_IP \
REMOTE_PATH=/opt/kartawarta \
LOCAL_CONTAINER=kartawarta-sqlserver \
REMOTE_CONTAINER=kartawarta-sqlserver \
DB_NAME=cardmarket \
DB_PASSWORD='LOCAL_SQL_PASSWORD' \
REMOTE_DB_PASSWORD='VPS_SQL_PASSWORD' \
bash scripts/sync_catalog_tables.sh all
```

The script creates a temporary export database locally, exports a `catalog_tables.bacpac`, copies it with `scp`, imports it into a temporary VPS database, then merges rows into production by stable keys (`TCG.id`, `Expansion.id`, `Card.cardMarketId`).


## 12. Run ingestion

Run ingestion after the app and database are healthy.

DBS:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile ingestion run --rm ingest-dbs
```

Riftbound:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.vps-2vcpu-4gb.yml --profile ingestion run --rm ingest-riftbound
```

On a 2 vCore / 4 GB VPS, run ingestion during low traffic. It can slow down backend and SQL Server.

## 13. Production monitoring without leaking metrics

### Recommended default

Do not run Grafana, Prometheus, or cAdvisor publicly.

For production, there are three safe options:

1. Do not run monitoring permanently. Use it only during sizing/debugging.
2. Run monitoring bound to `127.0.0.1` only, then access it through SSH tunnel.
3. Put Grafana behind nginx with HTTPS and strong auth. Keep Prometheus/cAdvisor/exporter private.

The repo includes `docker-compose.monitoring.prod.yml` for option 2. It removes public ports for cAdvisor, Prometheus, and docker-stats-exporter, and binds Grafana only to localhost:

```yaml
grafana:
  ports:
    - "127.0.0.1:3001:3000"
```

Start production with private monitoring:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.monitoring.yml \
  -f docker-compose.monitoring.prod.yml \
  -f docker-compose.vps-2vcpu-4gb.yml \
  up -d --build
```

Then open Grafana through SSH tunnel from your local machine:

```bash
ssh -L 3001:127.0.0.1:3001 YOUR_USER@YOUR_VPS_IP
```

Open locally:

```text
http://localhost:3001
```

Login with `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` from `.env`.

### Why not expose monitoring?

Do not expose these publicly:

- Prometheus can reveal service names, routes, latency, errors, and internal topology.
- cAdvisor can reveal container names, images, host paths, CPU/RAM, and filesystem details.
- docker-stats-exporter uses Docker socket read access and should stay internal.
- Grafana dashboards can reveal traffic patterns and infrastructure capacity.

### If you want Grafana on `https://kartawarta.pl/grafana/`

Only do this with strong Grafana password and HTTPS. Prometheus and cAdvisor should still have no public ports.

Add to host nginx:

```nginx
location /grafana/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

If serving Grafana under `/grafana/`, also configure Grafana root URL. Add to `.env` or monitoring compose environment:

```env
GF_SERVER_ROOT_URL=https://kartawarta.pl/grafana/
GF_SERVER_SERVE_FROM_SUB_PATH=true
```

Simpler and safer: use SSH tunnel instead.

## 14. Verify production

Public checks:

```bash
curl -I https://kartawarta.pl
curl https://kartawarta.pl/api/backend/tcgs
curl https://kartawarta.pl/api/vision/
```

Container checks:

```bash
docker stats --no-stream
```

OOM/restart check:

```bash
docker inspect kartawarta-sqlserver kartawarta-backend kartawarta-vision kartawarta-frontend \
  --format '{{.Name}} OOM={{.State.OOMKilled}} Restarting={{.State.Restarting}} Exit={{.State.ExitCode}}'
```

Public port check on VPS:

```bash
sudo ss -lntp
```

Expected public listeners should be only nginx on `:80` and `:443`, plus SSH.

## 15. Reboot test

```bash
sudo reboot
```

After reconnecting:

```bash
docker ps
curl -I https://kartawarta.pl
```

## 16. Backup note

SQL Server data is stored in the Docker volume `sqlserverdata`. Before major updates, back up the database or at minimum snapshot the VPS.

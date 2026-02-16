# Nginx Setup Instructions for Backup Server

Follow these steps to configure Nginx on your Ubuntu server.

### 0. Project Location
You can place the project files anywhere on your server. A common location is:
`/var/www/backup-server`

1. Upload the project folder to `/var/www/backup-server`
2. Make sure you are in that folder: `cd /var/www/backup-server`
3. Install dependencies: `npm install`
4. Build the project: `npm run build`

## 1. Create Config File
Create a new configuration file in `sites-available`:

```bash
sudo nano /etc/nginx/sites-available/backup-server
```

Paste the content from the `nginx.conf` file I created for you.

## 2. Create Symlink (Enable Site)
Create a symbolic link from `sites-available` to `sites-enabled`:

```bash
sudo ln -s /etc/nginx/sites-available/backup-server /etc/nginx/sites-enabled/
```

## 3. Verify and Restart
Check configuration for errors:

```bash
sudo nginx -t
```

If successful (`syntax is ok`), restart Nginx:

```bash
sudo systemctl restart nginx
```

## 4. SSL Certificates (Important)
Since the config uses SSL (`listen 443`), make sure you have certificates generated for `backup.spicc.ac.th`. If not, run Certbot:

```bash
sudo certbot --nginx -d backup.spicc.ac.th
```

## 5. Keep it running (Process Manager)
To make sure the server keeps running even after you close the terminal, use **PM2**:

1. Install PM2: `sudo npm install -g pm2`
2. Start the server: `pm2 start server.js --name "backup-server"`
3. Save the process: `pm2 save`
4. Make it start on boot: `pm2 startup` (then follow the instructions on screen)


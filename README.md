# Server Backup Manager

A modern web application for managing Ubuntu server backups, including MySQL database backups and file system backups.

## Features

- 🔐 **Secure Authentication** - Login system with session management
- 🗄️ **MySQL Backup** - Automated database backup using mysqldump
- 📁 **File System Backup** - Backup /www directory as compressed archives
- 📊 **Backup History** - Track all backup operations with download capability
- 🎨 **Modern UI** - Beautiful, responsive interface with glassmorphism design
- ⚡ **Real-time Updates** - Live status updates during backup operations

## Tech Stack

**Frontend:**
- React 18
- Vite
- React Router
- Axios

**Backend:**
- Node.js
- Express
- MySQL2
- bcryptjs
- express-session

## Prerequisites

- Node.js (v16 or higher)
- MySQL Server
- Ubuntu Server with:
  - `mysqldump` installed
  - Read access to `/www` directory
  - Sufficient disk space for backups

## Installation

### 1. Clone the repository

```bash
cd c:\Users\it\Desktop\WEB-MENU2GO\Backup_server
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### 4. Configure environment variables

The `.env` file is already configured with your database credentials:

```env
PORT=3101
DB_HOST=61.19.69.21
DB_USER=adminserver
DB_PASSWORD=Password@9876*/
DB_NAME=backup2026
DB_PORT=3306
SESSION_SECRET=backup_server_secret_key_2026
BACKUP_DIR=./backups
```

### 5. Set up the database

Run the SQL schema to create required tables:

```bash
mysql -h 61.19.69.21 -P 3306 -u adminserver -p backup2026 < database/schema.sql
```

**Note:** You'll need to update the hashed password in `schema.sql`. Run this to generate the hash:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin@789', 10));"
```

Then update the INSERT statement in `database/schema.sql` with the generated hash.

## Usage

### Development Mode

1. Start the backend server:
```bash
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd client
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

4. Login with:
   - **Username:** adminserver
   - **Password:** admin@789

### Production Build

1. Build the frontend:
```bash
cd client
npm run build
cd ..
```

2. Set environment variable:
```bash
$env:NODE_ENV="production"
```

3. Start the server:
```bash
npm start
```

4. Access the application at `http://localhost:3101`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Backup Operations
- `POST /api/backup/mysql` - Trigger MySQL backup
- `POST /api/backup/files` - Trigger file system backup
- `GET /api/backup/history` - Get backup history
- `GET /api/backup/download/:id` - Download backup file

## Security Notes

- Change default credentials in production
- Use HTTPS in production environments
- Ensure proper file permissions on backup directory
- Consider implementing JWT tokens for enhanced security
- Regularly rotate session secrets

## Troubleshooting

**Database connection fails:**
- Verify MySQL server is running
- Check database credentials in `.env`
- Ensure firewall allows connection to MySQL port

**Backup fails:**
- Verify `mysqldump` is installed: `mysqldump --version`
- Check read permissions on `/www` directory
- Ensure sufficient disk space in `./backups` directory

**Port already in use:**
- Change `PORT` in `.env` file
- Update proxy configuration in `client/vite.config.js`

## License

ISC

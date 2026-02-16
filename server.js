import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import backupRoutes from './routes/backup.js';
import settingsRoutes from './routes/settings.js';
import oauthRoutes from './routes/oauth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3101;

// Create backups directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
db.getConnection()
  .then(async connection => {
    console.log('✅ Database connected successfully');

    // Auto-create tables if they don't exist
    try {
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createBackupHistoryTable = `
        CREATE TABLE IF NOT EXISTS backup_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          backup_type ENUM('mysql', 'files') NOT NULL,
          filename VARCHAR(255) NOT NULL,
          filepath VARCHAR(500) NOT NULL,
          file_size BIGINT,
          status ENUM('success', 'failed') DEFAULT 'success',
          error_message TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          google_drive_file_id VARCHAR(255),
          uploaded_to_drive BOOLEAN DEFAULT FALSE,
          drive_upload_error TEXT,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `;

      await connection.query(createUsersTable);
      await connection.query(createBackupHistoryTable);

      // Check if admin user exists, if not create it
      const [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['adminserver']);
      if (users.length === 0) {
        const bcryptModule = await import('bcryptjs');
        const bcrypt = bcryptModule.default;
        const hashedPassword = bcrypt.hashSync('admin@789', 10);
        await connection.query(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          ['adminserver', hashedPassword]
        );
        console.log('✅ Created default admin user (adminserver / admin@789)');
      }

      console.log('✅ Database tables verified/created');
    } catch (err) {
      console.warn('⚠️  Table creation warning:', err.message);
    }

    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

// Middleware
app.use(cors({
  origin: 'http://localhost:3102',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'backup_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/oauth', oauthRoutes);

// Serve static files from client/dist in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createOAuthTable() {
    let connection;

    try {
        console.log('🔌 Connecting to database...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ Connected to database');

        // Create oauth_tokens table
        console.log('📝 Creating oauth_tokens table...');

        try {
            await connection.query(`
        CREATE TABLE IF NOT EXISTS oauth_tokens (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          provider VARCHAR(50) NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          expiry_date BIGINT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_provider (user_id, provider)
        )
      `);
            console.log('✅ oauth_tokens table created successfully!');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_OK') {
                console.log('ℹ️  Table already exists, skipping...');
            } else {
                throw error;
            }
        }

        console.log('\n✅ Database update completed!');

    } catch (error) {
        console.error('❌ Database update failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createOAuthTable();

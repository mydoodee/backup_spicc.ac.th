import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateDatabase() {
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

        // Add Google Drive columns
        console.log('📝 Adding Google Drive columns...');

        try {
            await connection.query(`
        ALTER TABLE backup_history 
        ADD COLUMN google_drive_file_id VARCHAR(255),
        ADD COLUMN uploaded_to_drive BOOLEAN DEFAULT FALSE,
        ADD COLUMN drive_upload_error TEXT
      `);
            console.log('✅ Columns added successfully!');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  Columns already exist, skipping...');
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

updateDatabase();

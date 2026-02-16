import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM backup_history');
        console.log('Total backups:', rows[0].count);
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

check();

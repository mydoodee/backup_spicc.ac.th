import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function setupDatabase() {
    let connection;

    try {
        console.log('🔌 Connecting to database...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Read and execute schema
        const schema = fs.readFileSync('./database/schema.sql', 'utf8');

        console.log('📝 Creating tables...');
        await connection.query(schema);

        console.log('✅ Database setup completed successfully!');
        console.log('\nTables created:');
        console.log('  - users');
        console.log('  - backup_history');
        console.log('\nDefault admin user:');
        console.log('  Username: adminserver');
        console.log('  Password: admin@789');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDatabase();

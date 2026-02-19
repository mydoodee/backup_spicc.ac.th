import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnose() {
    console.log('--- MySQL Backup Diagnostic ---');
    console.log('OS Platform:', process.platform);

    let mysqldumpPath = process.env.MYSQL_DUMP_PATH || 'mysqldump';
    console.log('Configured MYSQL_DUMP_PATH:', mysqldumpPath);

    const isWindowsPath = /^[a-zA-Z]:[/\\]/.test(mysqldumpPath) || mysqldumpPath.includes('\\');
    if (process.platform !== 'win32' && isWindowsPath) {
        console.log('⚠️ Detected Windows-style path on non-Windows OS, falling back to "mysqldump"');
        mysqldumpPath = 'mysqldump';
    }

    try {
        console.log(`Checking "${mysqldumpPath} --version"...`);
        const { stdout, stderr } = await execPromise(`"${mysqldumpPath}" --version`);
        console.log('✅ Found mysqldump:', stdout.trim());
    } catch (err) {
        console.log('❌ Failed to run mysqldump:', err.message);
        console.log('--- Debug info ---');
        console.log('Error Code:', err.code);
        console.log('Error Signal:', err.signal);
        console.log('Stderr:', err.stderr);
        console.log('---');
        console.log('Suggestions:');
        console.log('1. Ensure mysql-client is installed: sudo apt-get install mysql-client');
        console.log('2. Check if the path is correct in .env (if you want to use a specific path)');
        console.log('3. Currently it is trying to use:', mysqldumpPath);
    }

    const backupDir = path.join(__dirname, 'backups');
    console.log('Checking backups directory:', backupDir);
    try {
        const { stdout } = await execPromise(`ls -ld "${backupDir}"`);
        console.log('✅ Directory permissions:', stdout.trim());
    } catch (err) {
        console.log('❌ Directory issue:', err.message);
    }
}

diagnose();

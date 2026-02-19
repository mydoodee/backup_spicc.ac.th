import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../server.js';
import googleDriveService from './google-drive.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupService {
    /**
     * Perform MySQL Backups for all configured databases
     * @param {number} userId - ID of the user triggering the backup
     */
    async runMysqlBackup(userId) {
        const dbNamesSource = process.env.BACKUP_DBS || process.env.DB_NAME || '';
        const dbNames = dbNamesSource.split(',').map(name => name.trim()).filter(Boolean);

        if (dbNames.length === 0) {
            throw new Error('No databases configured in BACKUP_DBS or DB_NAME');
        }

        const results = [];
        const errors = [];
        const globalDumpUser = process.env.BACKUP_USER || process.env.DB_USER;
        const globalDumpPassword = process.env.BACKUP_PASSWORD || process.env.DB_PASSWORD;
        let mysqldumpPath = process.env.MYSQL_DUMP_PATH || 'mysqldump';

        // Basic fallback: if we are on Linux/Unix but the path looks like Windows (starts with Drive: or has backslashes)
        const isWindowsPath = /^[a-zA-Z]:[/\\]/.test(mysqldumpPath) || mysqldumpPath.includes('\\');
        if (process.platform !== 'win32' && isWindowsPath) {
            console.warn(`⚠️  Detected Windows-style path for mysqldump on ${process.platform}: "${mysqldumpPath}". Falling back to 'mysqldump' command.`);
            mysqldumpPath = 'mysqldump';
        }

        for (const dbName of dbNames) {
            try {
                const envSuffix = dbName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                const dumpUser = process.env[`DB_USER_${envSuffix}`] || globalDumpUser;
                const dumpPassword = process.env[`DB_PASSWORD_${envSuffix}`] || globalDumpPassword;

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `mysql_backup_${dbName}_${timestamp}.sql`;
                const backupPath = path.join(__dirname, '../backups', filename);

                const maskedCommand = `"${mysqldumpPath}" -h ${process.env.DB_HOST} -P ${process.env.DB_PORT} -u ${dumpUser} -p"********" ${dbName} > "${backupPath}"`;
                const command = `"${mysqldumpPath}" -h ${process.env.DB_HOST} -P ${process.env.DB_PORT} -u ${dumpUser} ${dbName} > "${backupPath}"`;

                console.log(`Running backup command: ${maskedCommand}`);

                try {
                    // Use MYSQL_PWD to avoid shell escaping issues with passwords
                    await execPromise(command, {
                        env: { ...process.env, MYSQL_PWD: dumpPassword }
                    });
                } catch (execErr) {
                    console.error(`Exec error for ${dbName}:`, execErr);
                    throw new Error(`Mysqldump failed: ${execErr.message}. Stderr: ${execErr.stderr || 'none'}`);
                }
                const fileSize = fs.statSync(backupPath).size;

                const [result] = await db.query(
                    'INSERT INTO backup_history (backup_type, filename, filepath, file_size, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                    ['mysql', filename, backupPath, fileSize, 'success', userId]
                );

                const backupId = result.insertId;
                let driveFileId = null;
                let driveError = null;

                if (googleDriveService.isEnabled()) {
                    try {
                        const isAuthorized = await googleDriveService.isAuthorized(userId);
                        if (isAuthorized) {
                            const driveFile = await googleDriveService.uploadFile(backupPath, filename, userId);
                            driveFileId = driveFile.id;
                            await db.query(
                                'UPDATE backup_history SET google_drive_file_id = ?, uploaded_to_drive = ? WHERE id = ?',
                                [driveFileId, true, backupId]
                            );
                        }
                    } catch (driveErr) {
                        driveError = driveErr.message;
                        await db.query(
                            'UPDATE backup_history SET drive_upload_error = ? WHERE id = ?',
                            [driveError, backupId]
                        );
                    }
                }

                results.push({ db: dbName, filename, size: fileSize, uploadedToDrive: !!driveFileId, driveError });

                // Auto-cleanup local file if uploaded to drive and not configured to keep it
                const keepLocal = process.env.KEEP_LOCAL_BACKUP === 'true';
                if (driveFileId && !keepLocal && fs.existsSync(backupPath)) {
                    try {
                        fs.unlinkSync(backupPath);
                        console.log(`🗑️ Deleted local backup file: ${filename}`);
                    } catch (unlinkErr) {
                        console.error(`❌ Failed to delete local file ${filename}:`, unlinkErr.message);
                    }
                }
            } catch (err) {
                console.error(`Backup failed for database ${dbName}:`, err.message);
                errors.push({ db: dbName, error: err.message });
                await db.query(
                    'INSERT INTO backup_history (backup_type, filename, filepath, status, error_message, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                    ['mysql', `failed_backup_${dbName}`, '', 'failed', err.message, userId]
                );
            }
        }

        return { success: results.length > 0, results, errors };
    }

    /**
     * Perform File System Backups for all configured paths
     * @param {number} userId - ID of the user triggering the backup
     */
    async runFilesBackup(userId) {
        const { default: sshService } = await import('./ssh-service.js');
        const isRemote = sshService.isEnabled();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const pathsSource = isRemote
            ? (process.env.REMOTE_FILES_PATH || '/var/www')
            : (process.env.FILES_BACKUP_PATH || '/www');

        const paths = pathsSource.split(',').map(p => p.trim()).filter(Boolean);

        if (paths.length === 0) {
            throw new Error('No paths configured for backup');
        }

        const results = [];
        const errors = [];
        const excludesSource = process.env.FILES_EXCLUDE || '';
        const excludes = excludesSource.split(',').map(e => e.trim()).filter(Boolean);

        for (const targetPath of paths) {
            const pathName = path.basename(targetPath).replace(/[^a-z0-9]/gi, '_');
            const filename = `file_backup_${pathName}_${timestamp}.tar.gz`;
            const backupPath = path.join(__dirname, '../backups', filename);

            try {
                if (isRemote) {
                    await sshService.downloadDirectoryAsTar(targetPath, backupPath, excludes);
                } else {
                    const parentDir = path.dirname(targetPath);
                    const targetDir = path.basename(targetPath);

                    let excludeFlags = '';
                    if (excludes.length > 0) {
                        excludeFlags = excludes.map(pattern => `--exclude='${pattern}'`).join(' ');
                    }

                    const command = `tar ${excludeFlags} -czf "${backupPath}" -C "${parentDir}" "${targetDir}" 2>&1`;
                    await execPromise(command);
                }

                const fileSize = fs.statSync(backupPath).size;

                const [result] = await db.query(
                    'INSERT INTO backup_history (backup_type, filename, filepath, file_size, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                    ['files', filename, backupPath, fileSize, 'success', userId]
                );

                const backupId = result.insertId;
                let driveFileId = null;
                let driveError = null;

                if (googleDriveService.isEnabled()) {
                    try {
                        const isAuthorized = await googleDriveService.isAuthorized(userId);
                        if (isAuthorized) {
                            const driveFile = await googleDriveService.uploadFile(backupPath, filename, userId);
                            driveFileId = driveFile.id;
                            await db.query(
                                'UPDATE backup_history SET google_drive_file_id = ?, uploaded_to_drive = ? WHERE id = ?',
                                [driveFileId, true, backupId]
                            );
                        }
                    } catch (driveErr) {
                        driveError = driveErr.message;
                        await db.query(
                            'UPDATE backup_history SET drive_upload_error = ? WHERE id = ?',
                            [driveError, backupId]
                        );
                    }
                }

                results.push({ path: targetPath, filename, size: fileSize, uploadedToDrive: !!driveFileId, driveError });

                // Auto-cleanup local file if uploaded to drive and not configured to keep it
                const keepLocal = process.env.KEEP_LOCAL_BACKUP === 'true';
                if (driveFileId && !keepLocal && fs.existsSync(backupPath)) {
                    try {
                        fs.unlinkSync(backupPath);
                        console.log(`🗑️ Deleted local file backup: ${filename}`);
                    } catch (unlinkErr) {
                        console.error(`❌ Failed to delete local file ${filename}:`, unlinkErr.message);
                    }
                }
            } catch (err) {
                errors.push({ path: targetPath, error: err.message });
                await db.query(
                    'INSERT INTO backup_history (backup_type, filename, filepath, status, error_message, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                    ['files', `failed_${pathName}`, '', 'failed', err.message, userId]
                );
            }
        }

        return { success: results.length > 0, results, errors };
    }
}

export default new BackupService();

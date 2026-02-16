import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../server.js';
import googleDriveService from '../services/google-drive.js';

const execPromise = promisify(exec);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Please login.'
        });
    }
    next();
};

// Apply auth middleware to all routes
router.use(requireAuth);

// MySQL Backup endpoint
router.post('/mysql', async (req, res) => {
    try {
        // Use BACKUP_DBS if set, otherwise fallback to DB_NAME (support both list and single)
        const dbNamesSource = process.env.BACKUP_DBS || process.env.DB_NAME || '';
        const dbNames = dbNamesSource.split(',').map(name => name.trim()).filter(Boolean);

        if (dbNames.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No databases configured in BACKUP_DBS or DB_NAME'
            });
        }

        const results = [];
        const errors = [];
        const filenames = [];

        // Global backup credentials (fallback)
        const globalDumpUser = process.env.BACKUP_USER || process.env.DB_USER;
        const globalDumpPassword = process.env.BACKUP_PASSWORD || process.env.DB_PASSWORD;
        const mysqldumpPath = process.env.MYSQL_DUMP_PATH || 'mysqldump';

        console.log(`Starting backup for ${dbNames.length} databases: ${dbNames.join(', ')}`);

        for (const dbName of dbNames) {
            try {
                // Resolve credentials for this specific database
                // Format: DB_USER_DBNAME (uppercase)
                const envSuffix = dbName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                const specificUser = process.env[`DB_USER_${envSuffix}`];
                const specificPassword = process.env[`DB_PASSWORD_${envSuffix}`];

                const dumpUser = specificUser || globalDumpUser;
                const dumpPassword = specificPassword || globalDumpPassword;

                console.log(`prepare backup for database: ${dbName} using user: ${dumpUser}`);

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `mysql_backup_${dbName}_${timestamp}.sql`;
                const backupPath = path.join(__dirname, '../backups', filename);

                // Create mysqldump command with explicit credentials
                const command = `"${mysqldumpPath}" -h ${process.env.DB_HOST} -P ${process.env.DB_PORT} -u ${dumpUser} -p"${dumpPassword}" ${dbName} > "${backupPath}"`;

                console.log(`Starting backup for database: ${dbName}...`);

                // Execute backup
                await execPromise(command);

                // Get file size
                const stats = fs.statSync(backupPath);
                const fileSize = stats.size;

                // Save to backup history
                const [result] = await db.query(
                    'INSERT INTO backup_history (backup_type, filename, filepath, file_size, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                    ['mysql', filename, backupPath, fileSize, 'success', req.session.userId]
                );

                const backupId = result.insertId;
                console.log(`✅ Backup completed for ${dbName}:`, filename);
                filenames.push(filename);

                // Upload to Google Drive if enabled
                let driveFileId = null;
                let driveError = null;

                if (googleDriveService.isEnabled()) {
                    try {
                        // Check if user has authorized Google Drive
                        const isAuthorized = await googleDriveService.isAuthorized(req.session.userId);

                        if (isAuthorized) {
                            console.log(`📤 Uploading ${filename} to Google Drive...`);
                            const driveFile = await googleDriveService.uploadFile(backupPath, filename, req.session.userId);
                            driveFileId = driveFile.id;

                            await db.query(
                                'UPDATE backup_history SET google_drive_file_id = ?, uploaded_to_drive = ? WHERE id = ?',
                                [driveFileId, true, backupId]
                            );

                            console.log(`✅ Uploaded ${filename} to Google Drive:`, driveFile.name);
                        } else {
                            console.log('ℹ️  Google Drive not authorized, skipping upload');
                        }
                    } catch (driveErr) {
                        console.error(`⚠️  Google Drive upload failed for ${filename}:`, driveErr.message);
                        driveError = driveErr.message;

                        await db.query(
                            'UPDATE backup_history SET drive_upload_error = ? WHERE id = ?',
                            [driveError, backupId]
                        );
                    }
                }

                results.push({
                    db: dbName,
                    filename,
                    size: fileSize,
                    uploadedToDrive: driveFileId !== null,
                    driveError
                });

            } catch (dbError) {
                console.error(`❌ Backup failed for database ${dbName}:`, dbError);
                errors.push({ db: dbName, error: dbError.message });

                // Log failed backup
                try {
                    await db.query(
                        'INSERT INTO backup_history (backup_type, filename, filepath, status, error_message, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                        ['mysql', `failed_backup_${dbName}`, '', 'failed', dbError.message, req.session.userId]
                    );
                } catch (logError) {
                    console.error('Failed to log error:', logError);
                }
            }
        }

        if (results.length === 0 && errors.length > 0) {
            // All failed
            return res.status(500).json({
                success: false,
                message: 'All database backups failed',
                errors
            });
        }

        res.json({
            success: true,
            message: `Backup completed for ${results.length}/${dbNames.length} databases`,
            filename: filenames.join(', '), // For frontend compatibility
            results,
            errors
        });

    } catch (error) {
        console.error('MySQL backup error:', error);
        res.status(500).json({
            success: false,
            message: 'MySQL backup process failed',
            error: error.message
        });
    }
});

// File System Backup endpoint
router.post('/files', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `www_backup_${timestamp}.tar.gz`;
        const backupPath = path.join(__dirname, '../backups', filename);
        let fileSize = 0;

        // Check if remote backup is configured
        // Import sshService dynamically or check env (we need to import it at top or require here)
        // Since we are using ES modules, better to import at top. 
        // NOTE: For this replace, assuming import is added at the top.
        const { default: sshService } = await import('../services/ssh-service.js');

        if (sshService.isEnabled()) {
            const remotePath = process.env.REMOTE_FILES_PATH || '/var/www';
            console.log(`Starting REMOTE backup from ${process.env.REMOTE_HOST}:${remotePath}...`);

            await sshService.downloadDirectoryAsTar(remotePath, backupPath);
            console.log('✅ Remote download completed');

            const stats = fs.statSync(backupPath);
            fileSize = stats.size;

        } else {
            // Local backup (fallback)
            const localPath = process.env.FILES_BACKUP_PATH || '/www'; // Use configured path or default /www
            const parentDir = path.dirname(localPath);
            const targetDir = path.basename(localPath);

            // Create tar command to backup directory
            // Use -C to change to parent directory so tarball contains relative path
            const command = `tar -czf "${backupPath}" -C "${parentDir}" "${targetDir}" 2>&1`;

            console.log(`Starting LOCAL backup of ${localPath}...`);

            // Execute backup
            const { stdout, stderr } = await execPromise(command);

            if (stderr && !stderr.includes('Removing leading')) {
                console.warn('Backup warning:', stderr);
            }

            // Get file size
            const stats = fs.statSync(backupPath);
            fileSize = stats.size;
        }

        // Save to backup history
        const [result] = await db.query(
            'INSERT INTO backup_history (backup_type, filename, filepath, file_size, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            ['files', filename, backupPath, fileSize, 'success', req.session.userId]
        );

        const backupId = result.insertId;

        console.log('✅ File system backup completed:', filename);

        // Upload to Google Drive if enabled
        let driveFileId = null;
        let driveError = null;

        if (googleDriveService.isEnabled()) {
            try {
                // Check if user has authorized Google Drive
                const isAuthorized = await googleDriveService.isAuthorized(req.session.userId);

                if (isAuthorized) {
                    console.log('📤 Uploading to Google Drive...');
                    const driveFile = await googleDriveService.uploadFile(backupPath, filename, req.session.userId);
                    driveFileId = driveFile.id;

                    await db.query(
                        'UPDATE backup_history SET google_drive_file_id = ?, uploaded_to_drive = ? WHERE id = ?',
                        [driveFileId, true, backupId]
                    );

                    console.log('✅ Uploaded to Google Drive:', driveFile.name);
                } else {
                    console.log('ℹ️  Google Drive not authorized, skipping upload');
                }
            } catch (driveErr) {
                console.error('⚠️  Google Drive upload failed:', driveErr.message);
                driveError = driveErr.message;

                await db.query(
                    'UPDATE backup_history SET drive_upload_error = ? WHERE id = ?',
                    [driveError, backupId]
                );
            }
        }

        res.json({
            success: true,
            message: 'File system backup completed successfully',
            filename,
            size: fileSize,
            uploadedToDrive: driveFileId !== null,
            driveError
        });

    } catch (error) {
        console.error('File system backup error:', error);

        // Log failed backup
        try {
            await db.query(
                'INSERT INTO backup_history (backup_type, filename, filepath, status, error_message, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                ['files', 'failed_backup', '', 'failed', error.message, req.session.userId]
            );
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }

        res.status(500).json({
            success: false,
            message: 'File system backup failed',
            error: error.message
        });
    }
});

// Get backup history
router.get('/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM backup_history');
        const total = countResult[0].total;

        // Get paginated results
        const [backups] = await db.query(
            `SELECT 
        bh.id,
        bh.backup_type,
        bh.filename,
        bh.file_size,
        bh.status,
        bh.error_message,
        bh.created_at,
        bh.google_drive_file_id,
        bh.uploaded_to_drive,
        bh.drive_upload_error,
        u.username
      FROM backup_history bh
      LEFT JOIN users u ON bh.created_by = u.id
      ORDER BY bh.created_at DESC
      LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.json({
            success: true,
            backups,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve backup history',
            error: error.message
        });
    }
});

// Download backup file
router.get('/download/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [backups] = await db.query(
            'SELECT * FROM backup_history WHERE id = ? AND status = ?',
            [id, 'success']
        );

        if (backups.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Backup file not found'
            });
        }

        const backup = backups[0];

        if (!fs.existsSync(backup.filepath)) {
            return res.status(404).json({
                success: false,
                message: 'Backup file does not exist on disk'
            });
        }

        res.download(backup.filepath, backup.filename);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download backup',
            error: error.message
        });
    }
});

export default router;

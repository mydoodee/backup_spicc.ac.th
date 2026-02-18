import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../server.js';
import googleDriveService from '../services/google-drive.js';
import backupService from '../services/backup-service.js';

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
        const result = await backupService.runMysqlBackup(req.session.userId);

        if (!result.success && result.errors.length > 0) {
            return res.status(500).json({
                success: false,
                message: 'All database backups failed',
                errors: result.errors
            });
        }

        res.json({
            success: true,
            message: `Backup completed for ${result.results.length}/${result.results.length + result.errors.length} databases`,
            results: result.results,
            errors: result.errors
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
        const result = await backupService.runFilesBackup(req.session.userId);

        res.json({
            success: result.success,
            message: `File backup completed for ${result.results.length}/${result.results.length + result.errors.length} locations`,
            results: result.results,
            errors: result.errors
        });
    } catch (error) {
        console.error('File system backup error:', error);
        res.status(500).json({
            success: false,
            message: 'File system backup process failed',
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

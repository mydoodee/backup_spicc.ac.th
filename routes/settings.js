import express from 'express';
import googleDriveService from '../services/google-drive.js';

const router = express.Router();

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

// Get Google Drive status and quota
router.get('/google-drive', async (req, res) => {
    try {
        const enabled = googleDriveService.isEnabled();

        if (!enabled) {
            return res.json({
                success: true,
                enabled: false,
                message: 'Google Drive is not enabled'
            });
        }

        // Check if user has authorized
        const isAuthorized = await googleDriveService.isAuthorized(req.session.userId);

        if (!isAuthorized) {
            return res.json({
                success: true,
                enabled: true,
                connected: false,
                message: 'Please authorize Google Drive access'
            });
        }

        // Get storage quota
        try {
            const quota = await googleDriveService.getStorageQuota(req.session.userId);

            res.json({
                success: true,
                enabled: true,
                connected: true,
                quota: {
                    limit: parseInt(quota.limit),
                    usage: parseInt(quota.usage),
                    usageInDrive: parseInt(quota.usageInDrive || 0),
                    usageInDriveTrash: parseInt(quota.usageInDriveTrash || 0)
                }
            });
        } catch (error) {
            res.json({
                success: true,
                enabled: true,
                connected: false,
                error: error.message
            });
        }

    } catch (error) {
        console.error('Google Drive status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Google Drive status',
            error: error.message
        });
    }
});

// Test Google Drive connection
router.post('/google-drive/test', async (req, res) => {
    try {
        const result = await googleDriveService.testConnection(req.session.userId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Google Drive connection successful',
                quota: result.quota
            });
        } else {
            res.json({
                success: false,
                message: 'Google Drive connection failed',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Google Drive test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test Google Drive connection',
            error: error.message
        });
    }
});

export default router;

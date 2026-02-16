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

// Get authorization URL
router.get('/google/authorize', async (req, res) => {
  try {
    await googleDriveService.initialize();
    const authUrl = googleDriveService.getAuthUrl();
    
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL',
      error: error.message
    });
  }
});

// Handle OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/settings?error=' + encodeURIComponent(error));
  }

  if (!code) {
    return res.redirect('/settings?error=no_code');
  }

  try {
    await googleDriveService.initialize();
    await googleDriveService.handleCallback(code, req.session.userId);
    
    res.redirect('/settings?success=true');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/settings?error=' + encodeURIComponent(error.message));
  }
});

// Disconnect Google Drive
router.post('/google/disconnect', async (req, res) => {
  try {
    await googleDriveService.revokeTokens(req.session.userId);
    
    res.json({
      success: true,
      message: 'Google Drive disconnected successfully'
    });
  } catch (error) {
    console.error('Failed to disconnect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Drive',
      error: error.message
    });
  }
});

export default router;

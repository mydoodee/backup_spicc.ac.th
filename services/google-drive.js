import { google } from 'googleapis';
import { db } from '../server.js';
import fs from 'fs';

class GoogleDriveService {
  constructor() {
    this.oauth2Client = null;
    this.drive = null;
    this.initialized = false;
    this.error = null;
  }

  async initialize() {
    try {
      if (!process.env.GOOGLE_DRIVE_ENABLED || process.env.GOOGLE_DRIVE_ENABLED !== 'true') {
        this.error = 'Google Drive is not enabled';
        return false;
      }

      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        this.error = 'Google OAuth2 credentials not configured';
        console.warn('⚠️  Google Drive: OAuth2 credentials not found in .env');
        return false;
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3101/api/oauth/google/callback'
      );

      console.log('✅ Google Drive OAuth2 client initialized');
      return true;
    } catch (error) {
      this.error = error.message;
      console.error('❌ Google Drive initialization failed:', error.message);
      return false;
    }
  }

  async setCredentials(userId) {
    try {
      // Get tokens from database
      const [tokens] = await db.query(
        'SELECT access_token, refresh_token, expiry_date FROM oauth_tokens WHERE user_id = ? AND provider = ?',
        [userId, 'google']
      );

      if (tokens.length === 0) {
        this.initialized = false;
        this.error = 'No OAuth tokens found. Please authorize the app.';
        return false;
      }

      const token = tokens[0];

      this.oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expiry_date: token.expiry_date
      });

      // Set up token refresh handler
      this.oauth2Client.on('tokens', async (newTokens) => {
        console.log('🔄 Refreshing Google Drive tokens...');

        const updateData = {
          access_token: newTokens.access_token,
          expiry_date: newTokens.expiry_date
        };

        if (newTokens.refresh_token) {
          updateData.refresh_token = newTokens.refresh_token;
        }

        await db.query(
          'UPDATE oauth_tokens SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expiry_date = ? WHERE user_id = ? AND provider = ?',
          [updateData.access_token, newTokens.refresh_token, updateData.expiry_date, userId, 'google']
        );
      });

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.initialized = true;
      this.error = null;

      return true;
    } catch (error) {
      this.error = error.message;
      console.error('❌ Failed to set credentials:', error.message);
      return false;
    }
  }

  getAuthUrl() {
    if (!this.oauth2Client) {
      this.initialize();
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.file'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleCallback(code, userId) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Save tokens to database
      await db.query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expiry_date)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         access_token = VALUES(access_token),
         refresh_token = VALUES(refresh_token),
         expiry_date = VALUES(expiry_date)`,
        [userId, 'google', tokens.access_token, tokens.refresh_token, tokens.expiry_date]
      );

      console.log('✅ OAuth tokens saved for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ OAuth callback failed:', error.message);
      throw error;
    }
  }

  async uploadFile(filePath, fileName, userId) {
    if (!this.initialized) {
      await this.initialize();
      await this.setCredentials(userId);
    }

    if (!this.initialized) {
      throw new Error(`Google Drive not initialized: ${this.error}`);
    }

    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : []
      };

      const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, size, webViewLink'
      });

      console.log('✅ File uploaded to Google Drive:', response.data.name);
      return response.data;
    } catch (error) {
      console.error('❌ Google Drive upload failed:', error.message);
      throw error;
    }
  }

  async deleteFile(fileId, userId) {
    if (!this.initialized) {
      await this.initialize();
      await this.setCredentials(userId);
    }

    if (!this.initialized) {
      throw new Error(`Google Drive not initialized: ${this.error}`);
    }

    try {
      await this.drive.files.delete({
        fileId: fileId
      });

      console.log('✅ File deleted from Google Drive:', fileId);
      return true;
    } catch (error) {
      console.error('❌ Google Drive delete failed:', error.message);
      throw error;
    }
  }

  async getStorageQuota(userId) {
    if (!this.initialized) {
      await this.initialize();
      await this.setCredentials(userId);
    }

    if (!this.initialized) {
      throw new Error(`Google Drive not initialized: ${this.error}`);
    }

    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota'
      });

      return response.data.storageQuota;
    } catch (error) {
      console.error('❌ Google Drive quota check failed:', error.message);
      throw error;
    }
  }

  async testConnection(userId) {
    if (!this.oauth2Client) {
      await this.initialize();
    }

    if (!this.oauth2Client) {
      return {
        success: false,
        error: this.error
      };
    }

    try {
      await this.setCredentials(userId);

      if (!this.initialized) {
        return {
          success: false,
          error: this.error
        };
      }

      const quota = await this.getStorageQuota(userId);
      return {
        success: true,
        quota: quota
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async revokeTokens(userId) {
    try {
      const [tokens] = await db.query(
        'SELECT access_token FROM oauth_tokens WHERE user_id = ? AND provider = ?',
        [userId, 'google']
      );

      if (tokens.length > 0) {
        // Revoke token with Google
        await this.oauth2Client.revokeToken(tokens[0].access_token);
      }

      // Delete from database
      await db.query(
        'DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?',
        [userId, 'google']
      );

      this.initialized = false;
      console.log('✅ OAuth tokens revoked for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to revoke tokens:', error.message);
      throw error;
    }
  }

  async isAuthorized(userId) {
    try {
      const [tokens] = await db.query(
        'SELECT id FROM oauth_tokens WHERE user_id = ? AND provider = ?',
        [userId, 'google']
      );

      return tokens.length > 0;
    } catch (error) {
      return false;
    }
  }

  isEnabled() {
    return process.env.GOOGLE_DRIVE_ENABLED === 'true';
  }

  getError() {
    return this.error;
  }
}

// Export singleton instance
const googleDriveService = new GoogleDriveService();
export default googleDriveService;

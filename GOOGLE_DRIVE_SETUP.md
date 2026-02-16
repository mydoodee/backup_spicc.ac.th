# Google Drive Setup Guide

This guide will help you set up Google Drive integration for automatic backup uploads.

## Prerequisites

- Google Account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Backup Server` (or any name you prefer)
4. Click **"Create"**

## Step 2: Enable Google Drive API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click on it and press **"Enable"**

## Step 3: Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in the details:
   - **Service account name:** `backup-server`
   - **Service account ID:** (auto-generated)
   - **Description:** `Service account for backup server uploads`
4. Click **"Create and Continue"**
5. Skip the optional steps (Grant access, Grant users access)
6. Click **"Done"**

## Step 4: Create Service Account Key

1. In the **Credentials** page, find your service account under **"Service Accounts"**
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. The JSON key file will be downloaded automatically
8. **IMPORTANT:** Keep this file secure! It contains credentials to access your Google Drive

## Step 5: Move Credentials File

1. Rename the downloaded file to `google-credentials.json`
2. Move it to your project root directory:
   ```
   C:\Users\it\Desktop\WEB-MENU2GO\Backup_server\google-credentials.json
   ```

## Step 6: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder for backups (e.g., "Server Backups")
3. Right-click the folder → **"Share"**
4. Copy the **service account email** from the JSON file (looks like: `backup-server@project-id.iam.gserviceaccount.com`)
5. Paste it in the share dialog
6. Set permission to **"Editor"**
7. Uncheck **"Notify people"**
8. Click **"Share"**

## Step 7: Get Folder ID

1. Open the folder you just created
2. Look at the URL in your browser:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
3. Copy the `FOLDER_ID_HERE` part
4. You'll need this for the configuration

## Step 8: Configure Application

1. Open `.env` file in your project
2. Add these lines:
   ```env
   GOOGLE_DRIVE_ENABLED=true
   GOOGLE_DRIVE_FOLDER_ID=YOUR_FOLDER_ID_HERE
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-credentials.json
   BACKUP_RETENTION_DAYS=30
   ```
3. Replace `YOUR_FOLDER_ID_HERE` with the folder ID from Step 7

## Step 9: Restart Server

1. Stop the backend server (Ctrl+C)
2. Run `npm run dev` again
3. The server should now connect to Google Drive

## Verification

1. Go to the Settings page in the web app
2. Check if Google Drive status shows "Connected"
3. View your storage quota
4. Click "Test Connection" to verify

## Troubleshooting

### Error: "Invalid credentials"
- Make sure the JSON file path is correct
- Verify the service account has access to the folder

### Error: "Folder not found"
- Check if the folder ID is correct
- Ensure the folder is shared with the service account email

### Error: "Insufficient permissions"
- Make sure the service account has "Editor" permission on the folder

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `google-credentials.json` to Git
- Keep the credentials file secure
- The file is already in `.gitignore`
- If compromised, delete the key in Google Cloud Console and create a new one

## Storage Limits

- Google Drive free tier: **15 GB**
- Monitor your usage in the Settings page
- Configure retention policy to auto-delete old backups
- Consider upgrading to Google One if needed

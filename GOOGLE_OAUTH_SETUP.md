# Google Drive OAuth2 Setup Guide

This guide will help you set up Google Drive integration using OAuth2, allowing users to authenticate with their own Google Account.

## ✅ Steps Overview
1. Create Google Cloud Project
2. Create OAuth2 Client ID
3. Configure Redirect URI
4. Update `.env` file

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **"Select a project"** → **"New Project"**
3. Name: `Backup Server`
4. Click **"Create"**

## Step 2: Enable Drive API

1. **"APIs & Services"** → **"Library"**
2. Search **"Google Drive API"**
3. Click **"Enable"**

## Step 3: Configure Authorization Screen

> [!IMPORTANT]
> **Using @gmail.com?**
> If you are using a personal `@gmail.com` account (like `doodeeup@gmail.com`), you **MUST** choose **"External"** and add your email to **"Test Users"**.

1. **"APIs & Services"** → **"OAuth consent screen"**
2. User Type: **"External"**
3. Click **"Create"** (or **"Edit App"** if already created)
4. App Information:
   - App Name: `Backup Server`
   - User Support Email: (your email)
   - Developer Contact: (your email)
5. Click **"Save and Continue"**
6. Scopes: Add `.../auth/drive.file`
7. **Test Users** (Critical Step):
   - Click **"+ ADD USERS"**
   - Type your email: `doodeeup@gmail.com`
   - Click **"ADD"**
   - Click **"Save and Continue"**

## Step 4: Create OAuth2 Credentials

1. **"APIs & Services"** → **"Credentials"**
2. **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Backup Web App`
5. **Authorized redirect URIs**: (IMPORTANT)
   - Add: `http://localhost:3101/api/oauth/google/callback`
6. Click **"Create"**

## Step 5: Get Credentials

You will see "Your Client ID" and "Client Secret". Copy these values.

- **Client ID**: (long string ending in .apps.googleusercontent.com)
- **Client Secret**: (string of random characters)

## Step 6: Configure Application

Open `.env` in your project folder and update:

```env
GOOGLE_DRIVE_ENABLED=true
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:3101/api/oauth/google/callback
```

(Replace with your actual ID and Secret)

## Step 7: Restart Server

Restart your backend server:
```powershell
npm run dev
```

## Step 8: Connect

1. Go to your Web App → Settings
2. Click **"Connect Google Drive"**
3. Login and Authorized
4. Done! 🎉

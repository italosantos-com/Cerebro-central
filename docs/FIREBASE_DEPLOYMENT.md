# Firebase Deployment Guide

This guide will help you deploy the Italo Santos Studio application to Firebase Hosting.

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **Firebase CLI** installed globally
3. **Firebase project** created and configured

## Setup Instructions

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase (if not already done)

```bash
firebase init
```

Select the following services:
- Hosting
- Firestore
- Storage
- Realtime Database

### 4. Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://YOUR_FIREBASE_PROJECT_ID-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_PROJECT_ID.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK (for server-side operations)
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
```

## Deployment Options

### Option 1: Quick Deployment (Recommended)

#### Windows:
```bash
deploy-firebase.bat
```

#### Linux/Mac:
```bash
chmod +x deploy-firebase.sh
./deploy-firebase.sh
```

### Option 2: Manual Deployment

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Deploy to Firebase:**
   ```bash
   firebase deploy
   ```

### Option 3: Deploy Specific Services

- **Hosting only:**
  ```bash
  npm run firebase-deploy-hosting
  ```

- **All services:**
  ```bash
  npm run firebase-deploy-all
  ```

## Project Structure

```
italo-santos-studio/
├── firebase.json          # Firebase configuration
├── .firebaserc           # Firebase project settings
├── firestore.rules       # Firestore security rules
├── storage.rules         # Storage security rules
├── database.rules.json   # Realtime Database rules
├── firestore.indexes.json # Firestore indexes
├── deploy-firebase.sh    # Linux/Mac deployment script
├── deploy-firebase.bat   # Windows deployment script
└── out/                  # Build output (generated)
```

## Configuration Files

### firebase.json
- Configures hosting, Firestore, Storage, and Database
- Sets up caching headers for static assets
- Configures URL rewrites for SPA routing

### Security Rules
- **firestore.rules**: Firestore security rules
- **storage.rules**: Storage security rules  
- **database.rules.json**: Realtime Database rules

## Build Process

The application is configured for Firebase Hosting with API support:
- Next.js builds to the `out` directory using standalone output
- API routes are handled by Firebase Functions
- Images are optimized for web performance
- All routes are pre-rendered where possible

## Deployment Architecture

### Option A: Static Export (Recommended for simple apps)
- Use `output: 'export'` in next.config.mjs
- All pages are pre-rendered as static files
- No API routes support
- Fastest deployment and loading

### Option B: Standalone with Functions (Current setup)
- Use `output: 'standalone'` in next.config.mjs
- API routes handled by Firebase Functions
- Full Next.js functionality
- Slightly more complex setup

### Option C: Vercel Deployment (Alternative)
- Keep current Vercel configuration
- Deploy to Vercel instead of Firebase
- Full Next.js API routes support
- Automatic deployments

## Troubleshooting

### Common Issues

1. **Build fails with canvas dependency:**
   - The canvas package is configured for server-side use only
   - It's excluded from client-side builds

2. **Firebase Admin SDK errors:**
   - Ensure all environment variables are set correctly
   - Check that the service account has proper permissions

3. **Deployment fails:**
   - Verify you're logged in to Firebase
   - Check that the project ID matches in `.firebaserc`
   - Ensure you have write permissions to the project

### Environment Variables

If you're deploying to a CI/CD environment, make sure to set all required environment variables:

```bash
# Required for build
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
# ... (all other NEXT_PUBLIC_ variables)

# Required for server-side operations
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx
# ... (all other FIREBASE_ variables)
```

## Post-Deployment

After successful deployment:

1. **Verify the deployment:**
   - Visit: https://YOUR_FIREBASE_PROJECT_ID.web.app
   - Check all features are working correctly

2. **Monitor logs:**
   ```bash
   firebase hosting:channel:list
   ```

3. **Set up custom domain (optional):**
   ```bash
   firebase hosting:sites:add your-custom-domain
   ```

## Support

If you encounter any issues during deployment, check:
1. Firebase Console for error logs
2. Build logs in your terminal
3. Environment variable configuration
4. Firebase project permissions

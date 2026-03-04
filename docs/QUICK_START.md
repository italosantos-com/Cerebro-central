# Quick Start - Firebase Deployment

## 🚀 Fast Setup (5 minutes)

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Run Setup Script
```bash
npm run firebase-setup
```
Choose option 1 for static export (recommended) or option 2 for full Next.js support.

### 4. Set Environment Variables
Copy `env.template` to `.env.local` and fill in your Firebase credentials.

### 5. Deploy
```bash
# Windows
deploy-firebase.bat

# Linux/Mac
chmod +x deploy-firebase.sh
./deploy-firebase.sh
```

## ✅ Done!

Your app will be available at: https://YOUR_FIREBASE_PROJECT_ID.web.app

## 🔧 Manual Setup

If you prefer manual setup:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the app:**
   ```bash
   npm run build
   ```

3. **Deploy to Firebase:**
   ```bash
   firebase deploy
   ```

## 📋 Prerequisites

- Node.js 18+
- Firebase project created
- Firebase CLI installed
- Environment variables configured

## 🆘 Need Help?

- Check `FIREBASE_DEPLOYMENT.md` for detailed instructions
- Review environment variables in `env.template`
- Ensure Firebase project is properly configured

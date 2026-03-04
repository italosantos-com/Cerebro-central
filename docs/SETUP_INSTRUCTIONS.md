# Project Setup Instructions

## 🔧 Configuration Required

This project has been cleaned of all personal/organization identifiers. Before use, configure:

### 1. Firebase Project

Replace `YOUR_FIREBASE_PROJECT_ID` in:
- `.firebaserc`
- `cloudbuild.yaml`
- `app.yaml`
- `docs/*.md`
- `functions/src/README.md`

### 2. Environment Variables

Configure `.env.production`, `.env.development`, `.env.private`, `.env.public` with your:
- Firebase credentials
- API keys (Twitter, PayPal, Instagram, Facebook, etc.)
- Payment gateway credentials
- Domain settings

### 3. SonarQube (Optional)

Update `.vscode/settings.json`:
- Replace `YOUR_SONARQUBE_PROJECT_KEY` with your project key

### 4. Git Remote (Optional)

If using GitHub/GitLab:
```bash
git remote add origin YOUR_REPOSITORY_URL
```

### 5. Firebase Authentication

Run:
```bash
firebase login
firebase use --add
# Select your Firebase project
```

### 6. Install Dependencies

```bash
npm install
```

### 7. Development

```bash
npm run dev
```

---

**⚠️ Security Note:** Never commit files in `.gitignore`, especially:
- `.env.private`
- `service-account-key.json`
- `merchant_id.*`
- `users.json`

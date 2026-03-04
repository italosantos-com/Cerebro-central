# Firebase WebAuthn Extension Setup

## Overview
This document summarizes the Firebase WebAuthn extension setup for passkey authentication in your application.

## Configuration Status ✅

### ✅ Firestore Database
- **Database ID**: `ext-firebase-web-authn`
- **Location**: `nam5` (North America)
- **Delete Protection**: Enabled
- **URL**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/databases/ext-firebase-web-authn/data

### ✅ Firebase Extension
- **Extension**: `gavinsawyer/firebase-web-authn`
- **Version**: 10.4.2
- **Status**: ACTIVE
- **Instance ID**: `firebase-web-authn`

### ✅ Hosting Configuration
- **Rewrite Rule**: `/firebase-web-authn-api` → `ext-firebase-web-authn-api`
- **Configuration**: Updated in `firebase.json`
- **Deployment**: Complete

### ⚠️ IAM Configuration (Manual Step Required)
The extension service account needs additional permissions that must be configured manually:

**Service Account**: `ext-firebase-web-authn@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com`

**Required Roles**:
1. **Service Account Token Creator** (`roles/iam.serviceAccountTokenCreator`)
2. **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`)

**Manual Configuration Steps**:
1. Go to [IAM Console](https://console.cloud.google.com/iam-admin/iam?project=YOUR_FIREBASE_PROJECT_ID)
2. Find the service account: `ext-firebase-web-authn@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com`
3. Click Edit (pencil icon)
4. Click 'ADD ANOTHER ROLE' and add both roles above
5. Click 'SAVE'

## API Endpoint

Your WebAuthn API is available at:
```
https://YOUR_FIREBASE_PROJECT_ID.web.app/firebase-web-authn-api
```

Or if using a custom domain:
```
https://yourdomain.com/firebase-web-authn-api
```

## Implementation Notes

### Domain Requirements
- The browser must reach FirebaseWebAuthn from the **same domain** as your website
- Ensure your custom domain (if any) includes the WebAuthn API rewrite

### Usage in Your App
The WebAuthn extension provides client-side JavaScript functions for:
- **Registration**: Creating new passkey credentials
- **Authentication**: Signing in with existing passkeys
- **Management**: Listing and removing user credentials

### Security Considerations
- Passkeys are stored securely in the user's device/browser
- No passwords are transmitted or stored
- Biometric authentication provides additional security
- Works across devices when synced (e.g., iCloud Keychain, Google Password Manager)

## Useful Links

- **Firebase Console**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID
- **Extensions Management**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions  
- **WebAuthn Database**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/databases/ext-firebase-web-authn/data
- **IAM Configuration**: https://console.cloud.google.com/iam-admin/iam?project=YOUR_FIREBASE_PROJECT_ID
- **Hosting**: https://YOUR_FIREBASE_PROJECT_ID.web.app

## Next Steps

1. **Complete IAM setup** (manual step above)
2. **Test the WebAuthn API** endpoint
3. **Implement passkey registration** in your authentication flow
4. **Add passkey login** as an authentication option
5. **Configure custom domain** (if needed) to ensure same-origin policy

## Troubleshooting

### Common Error: {"error":{"message":"Bad Request","status":"INVALID_ARGUMENT"}}

**Cause**: This error occurs when making GET requests to the WebAuthn API endpoint.

**Solution**: The WebAuthn API only accepts POST requests with proper JSON payloads.

#### ❌ Incorrect Usage:
```bash
# This will fail with INVALID_ARGUMENT
curl -X GET https://YOUR_FIREBASE_PROJECT_ID.web.app/firebase-web-authn-api
```

#### ✅ Correct Usage:
```bash
# This is the correct way to call the API
curl -X POST https://YOUR_FIREBASE_PROJECT_ID.web.app/firebase-web-authn-api \
  -H "Content-Type: application/json" \
  -d '{"action": "create", "displayName": "Test User", "email": "test@example.com"}'
```

### API Testing

1. **Test Page**: Visit `https://YOUR_FIREBASE_PROJECT_ID.web.app/webauthn-test.html` to test the API interactively
2. **Command Line**: Use the included `test-webauthn-api.sh` script
3. **Manual Testing**: Always use POST requests with JSON payloads

### Other Issues

If you encounter other issues:
1. Verify the IAM roles are properly assigned
2. Check that the extension status is ACTIVE in Firebase Console
3. Ensure your domain serves the WebAuthn API from the same origin
4. Test with different browsers/devices to verify cross-platform compatibility

---
*Setup completed on: 2025-09-19*
*Project: YOUR_FIREBASE_PROJECT_ID*

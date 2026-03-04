# Firestore Pabbly Connect Integration - Complete Setup Guide

## Overview
This document provides a complete guide for the Firestore Webhook Connector for Pabbly Connect extension that is now installed and active in your Firebase project.

## ✅ Installation Status

### Extension Details
- **Extension**: `pabblyconnect/firestore-pabbly-connector`
- **Version**: 0.1.4
- **Status**: ACTIVE ✅
- **Last Updated**: 2025-09-19 23:11:28

### Deployed Functions
The extension has deployed 3 Cloud Functions:
1. **ext-firestore-pabbly-connector-onCreateWebhook** - Handles document creation events
2. **ext-firestore-pabbly-connector-onUpdateWebhook** - Handles document update events  
3. **ext-firestore-pabbly-connector-onDeleteWebhook** - Handles document deletion events

## 🛠️ Configuration Requirements

### Required Parameters (Verify in Firebase Console)
1. **WEBHOOK_URL**: Your Pabbly Connect webhook endpoint
2. **CREATE_COLLECTION_PATH**: Firestore path to monitor for document creates
3. **UPDATE_COLLECTION_PATH**: Firestore path to monitor for document updates
4. **DELETE_COLLECTION_PATH**: Firestore path to monitor for document deletes

### Configuration Check
Go to [Firebase Console → Extensions](https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions) and verify all parameters are correctly set.

## 🧪 Testing Your Integration

### Manual Testing Steps
1. **Create Test**: Add a new document to your configured CREATE_COLLECTION_PATH
2. **Update Test**: Modify an existing document in your UPDATE_COLLECTION_PATH
3. **Delete Test**: Remove a document from your DELETE_COLLECTION_PATH

### Automated Testing
Use the provided testing script:
```bash
./test-pabbly-webhooks.sh
```

This script provides:
- Sample test data for each operation type
- Step-by-step manual testing instructions
- Expected webhook payload structures

## 📊 Monitoring & Debugging

### Function Logs
Monitor webhook calls and debug issues:
```bash
firebase functions:log --project=YOUR_FIREBASE_PROJECT_ID
```

### Useful Monitoring URLs
- **Firebase Console**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID
- **Extensions**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions
- **Function Logs**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/functions/logs
- **Firestore**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore

### Verification Script
Run the complete verification:
```bash
./verify-pabbly-connector.sh
```

## 🔄 Custom Event Handling

### Event Channel Information
The extension publishes custom events to:
- **Channel**: `projects/YOUR_FIREBASE_PROJECT_ID/locations/us-central1/channels/firebase`
- **Event Type**: `firebase.extensions.firestore-pabbly-connector.v1.complete`

### Custom Event Handlers
A custom event handler has been created in `functions/pabbly-event-handlers.ts` that:
- Logs all extension completion events
- Handles webhook success/failure monitoring
- Provides detailed error tracking
- Enables custom logic based on operation types

## 📋 Expected Webhook Payloads

### CREATE Event Payload
```json
{
  "eventType": "create",
  "documentPath": "collection/document-id",
  "data": { /* document data */ },
  "timestamp": "2025-09-19T23:20:00Z"
}
```

### UPDATE Event Payload
```json
{
  "eventType": "update",
  "documentPath": "collection/document-id",
  "before": { /* old document data */ },
  "after": { /* new document data */ },
  "timestamp": "2025-09-19T23:20:00Z"
}
```

### DELETE Event Payload
```json
{
  "eventType": "delete",
  "documentPath": "collection/document-id",
  "data": { /* deleted document data */ },
  "timestamp": "2025-09-19T23:20:00Z"
}
```

## 🚀 Next Steps

### 1. Verify Configuration
- [ ] Check WEBHOOK_URL is correct in extension settings
- [ ] Verify collection paths match your Firestore structure
- [ ] Test webhook endpoint accessibility

### 2. Test Integration
- [ ] Run manual tests for each operation type
- [ ] Verify payloads are received in Pabbly Connect
- [ ] Check webhook response times and reliability

### 3. Set Up Pabbly Workflows
- [ ] Create Pabbly Connect workflows to process webhook data
- [ ] Set up automation based on Firestore events
- [ ] Configure error handling and retry logic

### 4. Monitor Performance
- [ ] Set up alerts for webhook failures
- [ ] Monitor function execution times
- [ ] Track successful vs failed webhook deliveries

## 🔧 Troubleshooting

### Common Issues
1. **Webhook not receiving data**: Check WEBHOOK_URL configuration
2. **Function errors**: Review function logs for detailed error messages
3. **Missing events**: Verify collection paths match your document operations
4. **Timeout errors**: Check Pabbly webhook response times

### Support Resources
- **Extension Support**: support@pabbly.com
- **Firebase Support**: Firebase Console support section
- **Documentation**: Firebase Extensions documentation

## 📁 Files Created

### Scripts
- `verify-pabbly-connector.sh` - Complete verification and status check
- `test-pabbly-webhooks.sh` - Testing utilities and sample data

### Functions
- `functions/pabbly-event-handlers.ts` - Custom event handlers for monitoring

### Documentation
- `docs/PABBLY_INTEGRATION.md` - This complete setup guide

---

**Installation completed on**: 2025-09-19  
**Project**: YOUR_FIREBASE_PROJECT_ID  
**Extension Version**: 0.1.4

# Google Pay Extension Testing Guide

## Overview
This guide helps you test the Google Pay extension for processing payments through various Payment Service Providers (PSPs) like Mercado Pago, Stripe, PayPal, and Square.

## Current Extension Status

### Active Google Pay Extensions ✅
- **make-payment-opaf**: ACTIVE (v0.1.3)
- **deflaut**: ACTIVE (v0.1.3)

### Errored Google Pay Extensions ❌
- **italo-santos**: ERRORED (v0.1.3)
- **make-payment**: ERRORED (v0.1.3)

## How to Test the Extension

### Method 1: Firebase Console (Manual)

1. **Navigate to Firestore**
   - Go to [Firebase Console → Firestore](https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore)

2. **Create/Navigate to 'payments' Collection**
   - If it doesn't exist, create a new collection called `payments`

3. **Add a Test Document**
   ```json
   {
     "psp": "mercadopago",
     "total": 99.00,
     "currency": "brl",
     "paymentToken": {
       "signature": "MEQCIGdmTu/7oxjmqClgEkADU6TYeXcJVhsNKcqA...",
       "protocolVersion": "ECv2",
       "signedMessage": "{\"tag\":\"...\",\"data\":\"...\",\"ephemeralPublicKey\":\"...\"}"
     }
   }
   ```

4. **Wait and Check Results**
   - Wait 5-10 seconds after creating the document
   - Refresh the document to see if `result` fields appear
   - Look for status, transaction ID, and other payment processing results

### Method 2: Firebase Admin SDK (Programmatic)

Use the provided `test-google-pay.js` script:

```bash
# Install dependencies if needed
npm install firebase-admin

# Run the test script
node test-google-pay.js
```

Or use this code directly:

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'YOUR_FIREBASE_PROJECT_ID'
});

const db = admin.firestore();

// Add test payment
admin
  .firestore()
  .collection("payments")
  .add({
    psp: 'mercadopago',
    total: 99.00,
    currency: 'brl',
    paymentToken: {
      signature: 'MEQCIGdmTu/7oxjmqClgEkADU6TYeXcJVhsNKcqA...',
      protocolVersion: 'ECv2',
      signedMessage: '{"tag":"...","data":"...","ephemeralPublicKey":"..."}'
    }
  })
  .then(() => console.log("Payment request submitted!"));
```

## Supported PSPs and Configurations

### Mercado Pago (Brazil)
```json
{
  "psp": "mercadopago",
  "total": 99.00,
  "currency": "brl",
  "paymentToken": { /* Google Pay token */ }
}
```

### Stripe (Global)
```json
{
  "psp": "stripe",
  "total": 29.99,
  "currency": "usd",
  "paymentToken": { /* Google Pay token */ }
}
```

### PayPal
```json
{
  "psp": "paypal",
  "total": 49.99,
  "currency": "usd",
  "paymentToken": { /* Google Pay token */ }
}
```

### Square
```json
{
  "psp": "square",
  "total": 19.99,
  "currency": "usd",
  "paymentToken": { /* Google Pay token */ }
}
```

## Google Pay Token Structure

A valid Google Pay token should have this structure:

```json
{
  "signature": "MEQCIGdmTu/7oxjmqClgEkADU6TYeXcJVhsNKcqA...",
  "protocolVersion": "ECv2",
  "signedMessage": "{\"tag\":\"...\",\"data\":\"...\",\"ephemeralPublicKey\":\"...\"}"
}
```

**Note**: For testing purposes, you can use mock tokens, but for production, you need real Google Pay tokens from the Google Pay API.

## Expected Results

After the extension processes your payment document, you should see new fields added:

```json
{
  "psp": "mercadopago",
  "total": 99.00,
  "currency": "brl",
  "paymentToken": { /* original token */ },
  "result": {
    "status": "success",
    "transactionId": "TXN_123456789",
    "paymentId": "PAY_987654321",
    "timestamp": "2025-09-19T23:35:00Z",
    "gateway": "mercadopago"
  }
}
```

## Monitoring and Debugging

### Function Logs
Monitor extension activity:
```bash
firebase functions:log --project=YOUR_FIREBASE_PROJECT_ID
```

Look for logs containing:
- `ext-make-payment`
- Error messages
- Processing status

### Common Issues

1. **Extension shows ERRORED status**
   - Check function logs for detailed error messages
   - Verify PSP configuration and credentials
   - Ensure proper IAM permissions

2. **No result fields appear**
   - Verify payment token format is correct
   - Check if PSP is supported and configured
   - Monitor function logs for processing errors

3. **Invalid payment token errors**
   - Ensure Google Pay token structure is valid
   - Verify protocolVersion is "ECv2"
   - Check that signedMessage is properly formatted JSON

4. **PSP-specific errors**
   - Verify PSP credentials are configured in extension settings
   - Check currency support for the selected PSP
   - Ensure amount format matches PSP requirements

## Testing Scripts

### Available Scripts
- `./test-google-pay.sh` - Interactive testing guide
- `test-google-pay.js` - Automated testing with Node.js

### Quick Test Command
```bash
# Run the comprehensive test
./test-google-pay.sh
```

## Production Considerations

1. **Real Google Pay Tokens**: Replace mock tokens with real ones from Google Pay API
2. **PSP Credentials**: Configure actual PSP credentials in extension settings
3. **Error Handling**: Implement proper error handling for failed payments
4. **Monitoring**: Set up alerts for extension failures
5. **Security**: Validate payment tokens and amounts on the server side

## Support Resources

- **Firebase Console**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID
- **Extensions**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions
- **Function Logs**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/functions/logs
- **Firestore**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore

---

*Last updated: 2025-09-19*  
*Project: YOUR_FIREBASE_PROJECT_ID*

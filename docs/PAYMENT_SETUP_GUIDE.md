# Payment Integration Setup Guide

This guide explains how to configure payment methods (PayPal, MercadoPago, Google Pay, Apple Pay) for production deployment.

## Overview

The application supports multiple payment methods:
- **PayPal** (via PayPal JavaScript SDK v5) ✅ Implemented
- **MercadoPago** (PIX payments) ✅ Implemented
- **Google Pay** (standalone button, optional) ⚠️ Needs Configuration
- **Apple Pay** (standalone mock) ⚠️ Needs Configuration

## Payment Configuration Flow

### 1. Admin Panel Configuration (Recommended)
Admins can now configure payment credentials directly in the admin panel:

1. Navigate to `/admin/settings`
2. Scroll to the "Payment Settings" section
3. Configure each payment method:
   - **PIX (MercadoPago)**: Set the default value
   - **PayPal**: Enter Client ID, Client Secret, and email
   - **MercadoPago**: Enter Public Key, Access Token, and email
4. Toggle Sandbox mode for testing
5. Click "Save" to persist settings

Settings are stored in Firestore (`admin/profileSettings` document) and sync in real-time.

### 2. Environment Variables (Fallback)
If admin panel credentials are not set, the system falls back to environment variables:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_SANDBOX_CLIENT_ID=your_sandbox_client_id
PAYPAL_SANDBOX_CLIENT_SECRET=your_sandbox_client_secret

# Google Pay Configuration (if using standalone)
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME=Your_Business_Name
NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT=PRODUCTION # or TEST
NEXT_PUBLIC_BRAINTREE_MERCHANT_ID=your_braintree_merchant_id

# MercadoPago Configuration
MERCADOPAGO_PUBLIC_KEY=your_public_key
MERCADOPAGO_ACCESS_TOKEN=your_access_token
```

## Payment Method Details

### PayPal SDK v5 Integration

The application uses the classic PayPal JavaScript SDK (v5) for checkout buttons, focused on standard PayPal flows. Depending on your merchant configuration, Pay Later/PayPal Credit options may also appear automatically inside the v5 widget, but Google Pay and Apple Pay are no longer proxied through PayPal.

**Implementation Status**: ✅ Fully Implemented for PayPal checkout

**Configuration Required**:
1. **PayPal Developer Account**:
   - Create app at https://developer.paypal.com
   - Get Client ID and Secret
   - Configure return URLs
   - Enable required payment methods

2. **Alternative funding sources**:
   - Pay Later / PayPal Credit can be toggled from your PayPal merchant dashboard
   - Advanced credit and debit card payments also rely on the same SDK

**Known Issues**:
- ⚠️ PayPal button may fail to load if SDK is blocked by extensions or CSP.

**How to Fix**:
1. Confirm PayPal credentials in either the admin panel or environment variables
2. Verify the SDK script (`www.paypal.com/sdk/js`) is allowed through your CSP and not blocked by extensions
3. Ensure the domain is added to PayPal's allowed list if using production credentials

### Google Pay Standalone Integration

**Implementation Status**: ⚠️ Partially Implemented

The app has a standalone Google Pay button component but it needs proper configuration.

**Configuration Required**:
1. **Google Pay Merchant Account**:
   - Register at https://pay.google.com/business/console
   - Get Merchant ID
   - Add domains to allowed list

2. **Payment Gateway**:
   - Currently configured with Braintree gateway
   - Requires Braintree merchant account

3. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=your_merchant_id
   NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT=PRODUCTION
   NEXT_PUBLIC_BRAINTREE_MERCHANT_ID=your_braintree_id
   ```

**Recommendation**: Either finish the standalone Google Pay configuration or disable the button until a dedicated flow is needed (PayPal no longer proxies GPay).

### Apple Pay Standalone Integration

**Implementation Status**: ⚠️ Mock Implementation Only

The current Apple Pay modal is a mock and doesn't implement actual Apple Pay.

**Configuration Required for Real Implementation**:
1. **Apple Developer Account**:
   - Enroll in Apple Developer Program ($99/year)
   - Create Merchant ID
   - Generate payment processing certificate

2. **Domain Verification**:
   - Add domain to Apple Pay merchant identifier
   - Upload domain verification file to `.well-known/apple-developer-merchantid-domain-association`

3. **Payment Gateway**:
   - Configure with a supported payment processor
   - Currently not implemented

**Recommendation**: Implement a real Apple Pay flow through Apple Pay JS or hide this feature until ready (PayPal can no longer proxy it automatically).

### MercadoPago (PIX Payments)

**Implementation Status**: ✅ Implemented

**Configuration Required**:
1. **MercadoPago Account**:
   - Create account at https://www.mercadopago.com.br
   - Navigate to Developers section
   - Create application

2. **Get Credentials**:
   - Public Key: For client-side integration
   - Access Token: For server-side API calls

3. **Configure in Admin Panel**:
   - Go to `/admin/settings`
   - Enter Public Key and Access Token
   - Set PIX value (default subscription price)
   - Enable/disable Sandbox mode

## Production Checklist

### Before Deploying to Production:

- [ ] **PayPal**:
  - [ ] Configure production Client ID and Secret in admin panel
  - [ ] Disable Sandbox mode
  - [ ] Verify domain with PayPal
  - [ ] Enable Advanced Card Payments
  - [ ] Enable Alternative Payment Methods (Google Pay, Apple Pay)
  - [ ] Test payment flow end-to-end

- [ ] **Google Pay (Standalone)**:
   - [ ] Ensure Google Pay merchant account is configured
   - [ ] Test on real device (Google Pay doesn't work in emulators)
   - [ ] Verify merchant account is active

- [ ] **Apple Pay (Standalone)**:
   - [ ] Ensure Apple Developer merchant IDs/certificates are configured
   - [ ] Test on real Apple device with Apple Pay set up
   - [ ] Verify domain association file is deployed

- [ ] **MercadoPago**:
  - [ ] Configure production Public Key and Access Token
  - [ ] Disable Sandbox mode
  - [ ] Set correct PIX value
  - [ ] Test PIX payment flow

## Testing

### Test Sandbox Payments:
1. Enable Sandbox mode in admin panel
2. Use test credentials
3. Use PayPal sandbox accounts for testing
4. Use MercadoPago test cards

### Test Production Payments:
1. Disable Sandbox mode
2. Use production credentials
3. Test with small amounts first
4. Verify payments appear in your accounts

## Troubleshooting

### Google Pay Not Working
- **Symptom**: Google Pay button doesn't appear or fails to load
- **Causes**:
  - Merchant ID not configured
  - Gateway not configured correctly
  - Domain not verified
  - User doesn't have Google Pay set up
- **Solution**:
   1. Configure the standalone Google Pay integration properly (merchant ID, gateway, domain verification)
   2. Check browser console for errors
   3. Verify all environment variables are set

### Apple Pay Not Working
- **Symptom**: Apple Pay button doesn't appear or fails
- **Causes**:
  - Not using Safari or Apple device
  - Merchant ID not configured
  - Domain not verified
  - User doesn't have Apple Pay set up
- **Solution**:
   1. Complete the Apple Pay JS setup (merchant ID, certificates, domain association)
   2. Test only on real Apple devices
   3. Ensure domain has HTTPS
   4. Check browser console for errors

### PayPal Integration Issues
- **Symptom**: PayPal button doesn't load
- **Causes**:
  - Client ID/Secret not configured
  - SDK script blocked
  - CORS issues
- **Solution**:
  1. Check environment variables or admin panel settings
  2. Check browser console for errors
  3. Verify PayPal SDK script loads
  4. Check network tab for API errors

## Recommended Setup for Production

For the easiest and most reliable setup:

1. **Use PayPal SDK v5 for PayPal checkout**:
   - Configure PayPal credentials in admin panel
   - Enable Advanced Card Payments / Pay Later if desired
   - Rely on the standard PayPal button for core payments

2. **Use MercadoPago for PIX**:
   - Configure MercadoPago credentials in admin panel
   - Set PIX value
   - Test with Brazilian bank accounts

3. **Treat Google Pay and Apple Pay as separate projects**:
   - Each requires its own merchant onboarding and domain verification
   - Hide or disable the buttons until the setup is complete
   - Avoid partial implementations that confuse users

## Support

For issues with specific payment providers:
- **PayPal**: https://developer.paypal.com/support/
- **Google Pay**: https://developers.google.com/pay/api/support
- **Apple Pay**: https://developer.apple.com/support/
- **MercadoPago**: https://www.mercadopago.com.br/developers/pt/support

## Summary

The payment system is well-implemented with proper admin configuration. The main issues are:

1. ✅ **PayPal SDK v5**: Fully working, just needs production credentials
2. ✅ **MercadoPago**: Fully working, configurable in admin panel
3. ⚠️ **Google Pay**: Standalone button, needs merchant configuration
4. ⚠️ **Apple Pay**: Mock only, needs full Apple Pay JS implementation

**Action Items**:
1. Configure PayPal production credentials in admin panel
2. Enable Google Pay and Apple Pay in PayPal merchant account
3. Test all payment methods in production
4. Update MercadoPago credentials if needed

# SMS OTP Backend (Cloud Run)

A lightweight Express service to send and verify SMS One-Time Passwords (OTPs), designed to run on Google Cloud Run.

- Storage: Firestore via Firebase Admin SDK
- SMS Provider: Twilio (pluggable), with a no-op fallback if not configured
- Auth: Simple API key (x-api-key header)
- Rate limits: resend cooldown + per-hour send cap + verify attempts cap

## Endpoints

- GET /healthz
  - Liveness check
- POST /v1/sms/send-otp
  - Body: `{ "phone": "+5511999998888" }`
  - Headers: `x-api-key: <SMS_API_KEY>`
  - Returns: `{ ok: true, ttlSeconds: 300 }` or 429 errors for cooldown/quota
- POST /v1/sms/verify-otp
  - Body: `{ "phone": "+5511999998888", "code": "123456" }`
  - Headers: `x-api-key: <SMS_API_KEY>`
  - Returns: `{ ok: true }` or `{ ok: false, error: "invalid_or_expired" }`

Phones are normalized to E.164 automatically (defaultCountry BR). Invalid phones return 400.

## Environment Variables


### Firebase-only mode (sem Twilio)

- USE_FIREBASE_PHONE=true
- FIREBASE_WEB_API_KEY=<sua chave Web do Firebase>

Observações importantes:
- O endpoint de envio retorna `sessionInfo` e não o código em si (o código é gerado pelo Firebase e enviado por SMS pelo próprio serviço do Firebase Auth).
- Em produção, o Firebase exige reCAPTCHA (ou equivalente) para envio do SMS. Sem ajustes no front, o backend não consegue gerar um `recaptchaToken` por conta própria. Se o front não enviar `recaptchaToken`, o envio pode falhar com `recaptcha_required`.
- Alternativas sem mudar o front: configurar Identity Platform/Recaptcha Enterprise para isentar sua origem/servidor (políticas e billing podem ser necessários) — assim o backend poderia enviar sem token do cliente.
## Local Dev

```bash
# in sms-backend/
npm install
npm run dev
# curl health
curl http://localhost:8080/healthz
# send otp
curl -X POST http://localhost:8080/v1/sms/send-otp \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"phone":"+5511999998888"}'
```

If Twilio is not configured, the service logs the message and still creates the OTP. Use it for manual testing.

## Deploy with Cloud Build to Cloud Run

```bash
# from repo root
export PROJECT_ID=your-gcp-project
export REGION=us-central1

gcloud builds submit \
  --config=sms-backend/cloudbuild.sms.yaml \
  --substitutions=_SERVICE=sms-otp-service,_REGION=$REGION,_ALLOWED_ORIGINS=https://seu-dominio.com,_SMS_API_KEY=REDACTED,_TWILIO_ACCOUNT_SID=ACxxx,_TWILIO_AUTH_TOKEN=xxx,_TWILIO_FROM=+1234567890 \
  --async \
  .
```

After deploy, note the Cloud Run URL. Frontend must call the endpoints with the x-api-key header set to SMS_API_KEY.

## Notes

- Firestore access uses Application Default Credentials. Ensure the Cloud Run service account has permissions: `roles/datastore.user` or `roles/datastore.owner`.
- Consider private ingress or Cloud Armor if exposing publicly.
- For production, prefer App Check or signed JWT between services for stronger auth.

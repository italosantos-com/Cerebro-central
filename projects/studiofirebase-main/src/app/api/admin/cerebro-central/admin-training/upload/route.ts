import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { SUPERADMIN_EMAIL } from '@/lib/superadmin-config';

export const runtime = 'nodejs';

const normalizeExtension = (input: string) => {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned || 'jpg';
};

const resolveExtension = (fileName: string | null, contentType: string | null) => {
  if (fileName && fileName.includes('.')) {
    return normalizeExtension(fileName.split('.').pop() || '');
  }
  if (contentType && contentType.includes('/')) {
    return normalizeExtension(contentType.split('/').pop() || '');
  }
  return 'jpg';
};

const buildPublicUrl = (base: string, key: string) => {
  const trimmed = base.replace(/\/$/, '');
  return `${trimmed}/${key}`;
};

const normalizeR2Endpoint = (rawEndpoint: string | null | undefined) => {
  if (!rawEndpoint) return null;

  const endpoint = rawEndpoint.trim();
  if (!endpoint) return null;

  try {
    const url = new URL(endpoint);
    // S3 client precisa do endpoint-base (sem bucket/path)
    return `${url.protocol}//${url.host}`;
  } catch {
    return endpoint.replace(/\/$/, '').split('/').slice(0, 3).join('/');
  }
};

const resolveR2Config = () => {
  const bucket =
    process.env.CLOUDFLARE_R2_BUCKET ||
    process.env.CLOUDFLARE_CATALOG_BUCKET ||
    process.env.CLOUDFLARE_BUCKET ||
    '';

  const endpointRaw = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.CLOUDFLARE_S3_API || '';
  const endpoint = normalizeR2Endpoint(endpointRaw) || '';

  const accessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_ACCESS_KEY_ID ||
    '';

  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_SECRET_ACCESS_KEY ||
    '';

  const publicBaseUrl = process.env.CLOUDFLARE_PUBLIC_URL || '';

  const missing: string[] = [];
  if (!bucket) missing.push('bucket (CLOUDFLARE_R2_BUCKET ou CLOUDFLARE_CATALOG_BUCKET)');
  if (!endpoint) missing.push('endpoint (CLOUDFLARE_R2_ENDPOINT ou CLOUDFLARE_S3_API)');
  if (!accessKeyId) missing.push('accessKeyId (CLOUDFLARE_R2_ACCESS_KEY_ID/R2_ACCESS_KEY_ID/AWS_ACCESS_KEY_ID)');
  if (!secretAccessKey) missing.push('secretAccessKey (CLOUDFLARE_R2_SECRET_ACCESS_KEY/R2_SECRET_ACCESS_KEY/AWS_SECRET_ACCESS_KEY)');
  if (!publicBaseUrl) missing.push('publicUrl (CLOUDFLARE_PUBLIC_URL)');

  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    missing,
  };
};

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ success: false, message: 'Firestore indisponivel.' }, { status: 500 });
    }

    const adminSnap = await adminDb.collection('admins').doc(authResult.uid).get();
    if (!adminSnap.exists) {
      return NextResponse.json({ success: false, message: 'Acesso restrito a admins.' }, { status: 403 });
    }
    const adminData = adminSnap.data() || {};
    if (adminData.status === 'blocked') {
      return NextResponse.json({ success: false, message: 'Admin bloqueado.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Arquivo nao encontrado.' }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: 'Somente imagens sao permitidas.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash('sha256').update(buffer).digest('hex');

    const existingSnap = await adminDb
      .collection('admin_training_images')
      .where('hash', '==', hash)
      .limit(1)
      .get();

    const existingDoc = existingSnap.empty ? null : existingSnap.docs[0];
    const existingData = existingDoc ? (existingDoc.data() as any) : null;
    const isDuplicate = Boolean(existingDoc);

    const { bucket, endpoint, accessKeyId, secretAccessKey, publicBaseUrl, missing } = resolveR2Config();

    if (missing.length > 0) {
      console.error('[Admin Training Upload] Cloudflare R2 nao configurado:', {
        missing,
        endpointRaw: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.CLOUDFLARE_S3_API || null,
        endpointNormalized: endpoint || null,
        bucket: bucket || null,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Cloudflare R2 nao configurado: ${missing.join('; ')}`,
        },
        { status: 500 }
      );
    }

    const extension = resolveExtension(file.name || null, file.type || null);
    const key = `admin-training/${authResult.uid}/${hash}.${extension}`;

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true
    });

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: file.type || 'image/jpeg'
        })
      );
    } catch (uploadError: any) {
      console.error('[Admin Training Upload] Falha no upload R2:', {
        message: uploadError?.message,
        bucket,
        endpoint,
        code: uploadError?.Code || uploadError?.code,
      });

      return NextResponse.json(
        {
          success: false,
          message: uploadError?.message || 'Falha ao enviar arquivo para Cloudflare R2.',
        },
        { status: 500 }
      );
    }

    const imageUrl = buildPublicUrl(publicBaseUrl, key);

    const recordRef = await adminDb.collection('admin_training_images').add({
      adminUid: authResult.uid,
      hash,
      imageUrl,
      originalName: file.name || null,
      contentType: file.type || null,
      createdAt: new Date().toISOString(),
      duplicateOf: existingDoc ? existingDoc.id : null
    });

    let alertCreated = false;
    if (isDuplicate) {
      const superAdminSnap = await adminDb
        .collection('admins')
        .where('email', '==', SUPERADMIN_EMAIL)
        .limit(1)
        .get();
      const superAdminUid = superAdminSnap.empty ? null : superAdminSnap.docs[0].id;

      const recipientSet = new Set<string>();
      recipientSet.add(authResult.uid);
      if (existingData?.adminUid) {
        recipientSet.add(existingData.adminUid);
      }
      if (superAdminUid) {
        recipientSet.add(superAdminUid);
      }

      await adminDb.collection('admin_fraud_alerts').add({
        type: 'duplicate_admin_training_image',
        status: 'open',
        hash,
        adminUid: authResult.uid,
        existingAdminUid: existingData?.adminUid || null,
        imageUrl,
        existingImageUrl: existingData?.imageUrl || null,
        trainingImageId: recordRef.id,
        createdAt: new Date().toISOString(),
        recipients: Array.from(recipientSet)
      });

      alertCreated = true;
    }

    return NextResponse.json({
      success: true,
      duplicate: isDuplicate,
      imageUrl,
      alertCreated
    });
  } catch (error: any) {
    console.error('[Admin Training Upload] Erro ao enviar imagem:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Falha ao enviar imagem.' },
      { status: 500 }
    );
  }
}

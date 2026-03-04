import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

function validateUsernameFormat(username: string): { ok: boolean; message?: string } {
  const clean = username.toLowerCase().trim();
  const usernameRegex = /^[a-z0-9-_]{3,20}$/;
  if (!usernameRegex.test(clean)) {
    return { ok: false, message: 'Username deve ter 3-20 caracteres (apenas letras minúsculas, números, - e _)' };
  }

  const reservedUsernames = [
    'admin', 'api', 'auth', 'dashboard', 'login', 'register',
    'logout', 'perfil', 'assinante', 'galeria', 'fotos', 'videos',
    'chat', 'loja', 'stripe', 'paypal', 'pix', 'app', 'www'
  ];

  if (reservedUsernames.includes(clean)) {
    return { ok: false, message: 'Este username está reservado pelo sistema' };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ success: false, message: 'Firebase Admin não inicializado' }, { status: 500 });
    }

    const body = await request.json();
    const { idToken, name, phone, username } = body as {
      idToken?: string;
      name?: string;
      phone?: string;
      username?: string;
    };

    if (!idToken) {
      return NextResponse.json({ success: false, message: 'idToken ausente' }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400 });
    }
    if (!username?.trim()) {
      return NextResponse.json({ success: false, message: 'Username é obrigatório' }, { status: 400 });
    }

    const usernameCheck = validateUsernameFormat(username);
    if (!usernameCheck.ok) {
      return NextResponse.json({ success: false, message: usernameCheck.message }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ success: false, message: 'Token inválido ou expirado' }, { status: 401 });
    }

    if (!decoded?.uid) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Identificar se é o primeiro admin do sistema
    const existingAdminsSnap = await adminDb.collection('admins').limit(1).get();
    const isFirstAdmin = existingAdminsSnap.empty;

    const cleanUsername = username.toLowerCase().trim();

    // BUG #5: Unicidade do username (incluindo SuperAdmin e outros admins)
    if (cleanUsername === 'severepics') {
      return NextResponse.json({ success: false, message: 'Este username está reservado para o SuperAdmin' }, { status: 409 });
    }

    const usernameSnap = await adminDb
      .collection('admins')
      .where('username', '==', cleanUsername)
      .limit(1)
      .get();

    if (!usernameSnap.empty) {
      return NextResponse.json({ success: false, message: 'Este username já está em uso' }, { status: 409 });
    }

    const uid = decoded.uid as string;

    const adminDoc = {
      uid,
      name: name.trim(),
      email: decoded.email || null,
      phone: phone || decoded.phone_number || null,
      username: cleanUsername,
      role: 'admin',
      status: 'active',
      isMainAdmin: isFirstAdmin,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('admins').doc(uid).set(adminDoc, { merge: true });

    // Criar ProfileSettings individual com dados do cadastro (sem usar perfil global)
    await adminDb
      .collection('admins')
      .doc(uid)
      .collection('profile')
      .doc('settings')
      .set({
        name: adminDoc.name || '',
        email: adminDoc.email || '',
        phone: adminDoc.phone || '',
        username: adminDoc.username || '',
        address: '',
        description: '',
        profilePictureUrl: '/placeholder-photo.svg',
        coverPhotoUrl: '/placeholder-cover.svg',
        galleryPhotos: [],
        galleryNames: [
          'ACOMPANHANTE MASCULINO',
          'SENSUALIDADE',
          'PRAZER',
          'BDSM',
          'FETISH',
          'FANTASIA',
          'IS'
        ],
        adultWorkLabel: '+18 ADULT WORK',
        socialMedia: {
          instagram: '',
          twitter: '',
          youtube: '',
          whatsapp: '',
          telegram: ''
        },
        reviewSettings: {
          showReviews: true,
          moderateReviews: true,
          defaultReviewMessage: '',
          sendReviewToSecretChat: false
        },
        paymentSettings: {
          pixValue: 99.0,
          pixKey: '',
          pixKeyType: 'email'
        },
        footerSettings: {
          showTwitter: false,
          twitterUrl: '',
          showInstagram: false,
          instagramUrl: '',
          showYoutube: false,
          youtubeUrl: '',
          showWhatsapp: false,
          whatsappUrl: '',
          showTelegram: false,
          telegramUrl: '',
          showFacebook: false,
          facebookUrl: ''
        },
        appearanceSettings: {
          textColor: '#ffffff',
          numberColor: '#ffffff',
          buttonColor: '#ffffff',
          buttonTextColor: '#000000',
          lineColor: '#4b5563',
          neonGlowColor: '#ffffff',
          containerColor: '#111111',
          backgroundColor: '#000000',
          fontFamily: '"Times New Roman", Times, serif',
          fontSizePx: 16,
          iconColor: '#ffffff',
          userSidebarIconColor: '#ffffff',
          adminSidebarIconColor: '#ffffff',
          secretChatColor: '#ffffff',
          whatsappBubbleColor: '#000000'
        }
      }, { merge: true });

    // Custom claims: alinhar com regras/authorizações baseadas em token.
    await adminAuth.setCustomUserClaims(uid, {
      role: 'admin',
      isMainAdmin: isFirstAdmin,
      username: cleanUsername,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Bootstrap] Erro:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao finalizar bootstrap do administrador' },
      { status: 500 }
    );
  }
}

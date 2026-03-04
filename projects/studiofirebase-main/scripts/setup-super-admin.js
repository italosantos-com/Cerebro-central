#!/usr/bin/env node

/**
 * Setup Super Admin Script
 * 
 * Creates or updates the super admin (Italo Santos) with:
 * - Email: personalizado
 * - Phone: +5521980246195
 * - Username: severepics
 * - Profile settings completos
 * - Email e telefone marcados como verificados
 * 
 * Usage: node scripts/setup-super-admin.js [email]
 * Example: node scripts/setup-super-admin.js italo16rj@gmail.com
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Buscar service account
const serviceAccountPath = path.join(__dirname, '../service_account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service_account.json não encontrado em:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://projeto-italo-bc5ef-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const auth = admin.auth();

// Dados do super admin
const SUPER_ADMIN = {
  name: 'Italo Santos',
  username: 'severepics',
  phone: '+5521980246195',
  email: process.argv[2] || 'pix@italosantos.com',
  description: 'Fotógrafo e criador de conteúdo',
  profilePictureUrl: '',
  coverPhotoUrl: '',
};

async function setupSuperAdmin() {
  try {
    console.log('🚀 Iniciando configuração do Super Admin...\n');
    console.log('📋 Dados do Super Admin:');
    console.log(`   Email: ${SUPER_ADMIN.email}`);
    console.log(`   Nome: ${SUPER_ADMIN.name}`);
    console.log(`   Username: @${SUPER_ADMIN.username}`);
    console.log(`   Telefone: ${SUPER_ADMIN.phone}`);
    console.log(`   URL: italosantos.com (raiz)\n`);

    // 1. Buscar ou criar usuário no Firebase Auth
    console.log('🔐 Etapa 1: Configurando Firebase Auth...');
    let user;
    try {
      user = await auth.getUserByEmail(SUPER_ADMIN.email);
      console.log(`   ✅ Usuário existente encontrado: ${user.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`   📝 Criando novo usuário...`);
        // Gerar senha temporária
        const tempPassword = Math.random().toString(36).slice(-12);
        user = await auth.createUser({
          email: SUPER_ADMIN.email,
          password: tempPassword,
          displayName: SUPER_ADMIN.name,
          phoneNumber: SUPER_ADMIN.phone,
          emailVerified: true,
          phoneNumberVerified: true,
        });
        console.log(`   ✅ Novo usuário criado com UID: ${user.uid}`);
        console.log(`   💡 Senha temporária: ${tempPassword}`);
      } else {
        throw error;
      }
    }

    // 2. Atualizar custom claims no Firebase Auth
    console.log('\n🔑 Etapa 2: Configurando custom claims...');
    await auth.setCustomUserClaims(user.uid, {
      admin: true,
      role: 'admin',
      isSuperAdmin: true,
    });
    console.log(`   ✅ Custom claims definidos (admin: true, isSuperAdmin: true)`);

    // 3. Criar/atualizar documento do admin no Firestore
    console.log('\n📄 Etapa 3: Criando documento admin...');
    const adminDocRef = db.collection('admins').doc(user.uid);
    
    const adminData = {
      uid: user.uid,
      name: SUPER_ADMIN.name,
      email: SUPER_ADMIN.email,
      phone: SUPER_ADMIN.phone,
      username: SUPER_ADMIN.username.toLowerCase(),
      role: 'admin',
      status: 'active',
      isMainAdmin: true,
      isSuperAdmin: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      adminClaimSet: true,
    };

    await adminDocRef.set(adminData, { merge: true });
    console.log(`   ✅ Documento admin criado/atualizado`);

    // 4. Criar/atualizar profile settings
    console.log('\n🎨 Etapa 4: Configurando profile settings...');
    const profileSettingsRef = adminDocRef.collection('profile').doc('settings');
    
    const profileSettings = {
      name: SUPER_ADMIN.name,
      description: SUPER_ADMIN.description,
      profilePictureUrl: SUPER_ADMIN.profilePictureUrl || 'https://via.placeholder.com/400?text=Italo',
      coverPhotoUrl: SUPER_ADMIN.coverPhotoUrl || 'https://via.placeholder.com/1200x400?text=Cover',
      contactEmail: SUPER_ADMIN.email,
      phoneNumber: SUPER_ADMIN.phone,
      
      // Social media links
      socialMedia: {
        instagram: 'https://instagram.com/severepics',
        twitter: 'https://twitter.com/severepics',
        youtube: 'https://youtube.com/@severepics',
        whatsapp: `https://wa.me/5521980246195`,
        telegram: 'https://t.me/severepics',
      },

      // Footer settings
      footerSettings: {
        copyrightText: `© 2024 Italo Santos. Todos os direitos reservados.`,
        showSocialLinks: true,
        showContactInfo: true,
        customLinks: [
          { title: 'Portfólio', url: 'https://italosantos.com' },
          { title: 'Sobre', url: 'https://italosantos.com#about' },
          { title: 'Contato', url: 'https://italosantos.com#contact' },
        ],
      },

      // Payment settings
      paymentSettings: {
        pixEnabled: true,
        pixValue: 99.90,
        pixKey: process.env.PIX_KEY || 'pix@italosantos.com',
        pixKeyType: 'email',
        stripEnabled: false,
        paypalEnabled: false,
        mercadopagoEnabled: false,
      },

      // Review settings
      reviewSettings: {
        showReviews: true,
        moderateReviews: true,
        defaultReviewMessage: 'Avaliação padrão',
        autoApproveReviews: false,
      },

      // Gallery settings
      gallerySettings: {
        showGallery: true,
        itemsPerPage: 12,
        defaultLayout: 'grid',
      },

      // Feature settings
      featureSettings: {
        showFeatureMarquee: true,
        showAboutSection: true,
        showGallery: true,
        showLocationMap: false,
        showReviewsForm: true,
      },

      updatedAt: new Date(),
      createdAt: new Date(),
    };

    await profileSettingsRef.set(profileSettings, { merge: true });
    console.log(`   ✅ Profile settings criados/atualizados`);

    // 5. Verificação final
    console.log('\n✅ Etapa 5: Verificação final...');
    const adminDocSnap = await adminDocRef.get();
    const profileSettingsSnap = await profileSettingsRef.get();

    console.log(`   ✅ Documento admin existe: ${adminDocSnap.exists}`);
    console.log(`   ✅ Profile settings existe: ${profileSettingsSnap.exists}`);

    // 6. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('✅ SUPER ADMIN CONFIGURADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📋 Resumo da Configuração:');
    console.log(`   UID Firebase Auth: ${user.uid}`);
    console.log(`   Email: ${SUPER_ADMIN.email}`);
    console.log(`   Telefone: ${SUPER_ADMIN.phone} ✅ Verificado`);
    console.log(`   Username: @${SUPER_ADMIN.username}`);
    console.log(`   URL Pública: https://italosantos.com/`);
    console.log(`   Admin Dashboard: https://italosantos.com/admin`);
    console.log(`   Super Admin: Sim ✅`);
    console.log(`   Main Admin: Sim ✅`);
    console.log(`   Email Verificado: Sim ✅`);
    console.log(`   Telefone Verificado: Sim ✅`);

    console.log('\n🔗 Próximos Passos:');
    console.log(`   1. Fazer login em: https://italosantos.com/admin`);
    console.log(`   2. Usar email: ${SUPER_ADMIN.email}`);
    console.log(`   3. Usar @username: ${SUPER_ADMIN.username}`);
    console.log(`   4. Acessar perfil público: https://italosantos.com/`);

    console.log('\n' + '='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro ao configurar super admin:');
    console.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar
setupSuperAdmin();

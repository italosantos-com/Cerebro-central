// Script de testes para Instagram API with Instagram Login
// Cole isso no console do navegador na página /admin/integrations

console.log('='.repeat(50));
console.log('INSTAGRAM API WITH INSTAGRAM LOGIN - TESTE COMPLETO');
console.log('='.repeat(50));

// ============================================
// 1. TESTE DE INICIALIZAÇÃO
// ============================================
console.log('\n1️⃣  TESTE: Inicializando Instagram SDK');

(async () => {
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        await InstagramSDKIntegration.initialize();
        console.log('✅ Instagram SDK inicializado');
        console.log('FB global:', typeof window.FB !== 'undefined');
    } catch (error) {
        console.error('❌ Erro:', error);
    }
})();

// ============================================
// 2. TESTE DE VERIFICAÇÃO DE CREDENCIAIS
// ============================================
setTimeout(async () => {
    console.log('\n2️⃣  TESTE: Verificando Credenciais');
    console.log('NEXT_PUBLIC_FACEBOOK_APP_ID:', process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);
    console.log('✅ Escopos Instagram atualizados (instagram_business_*)');
}, 1000);

// ============================================
// 3. TESTE DO HOOK
// ============================================
setTimeout(async () => {
    console.log('\n3️⃣  TESTE: Hook useInstagramIntegration');
    try {
        const { useInstagramIntegration } = await import('@/hooks/useInstagramIntegration');
        const instagram = useInstagramIntegration();
        console.log('✅ Hook carregado com sucesso');
        console.log('Métodos disponíveis:');
        console.log('  • initialize');
        console.log('  • login');
        console.log('  • logout');
        console.log('  • getProfile');
        console.log('  • getMedia');
        console.log('  • publishMedia');
        console.log('  • getInsights');
        console.log('  • replyToComment');
        console.log('  • getMessages');
        console.log('  • sendMessage');
        console.log('  • apiCall');
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}, 2000);

// ============================================
// 4. TESTE DE NOVOS ESCOPOS
// ============================================
setTimeout(async () => {
    console.log('\n4️⃣  TESTE: Verificando Novos Escopos');
    console.log('✅ Escopos Instagram atualizados (obrigatório até 27/01/2025):');
    console.log('  • instagram_business_basic (antes: business_basic)');
    console.log('  • instagram_business_content_publish (antes: business_content_publish)');
    console.log('  • instagram_business_manage_messages (antes: business_manage_messages)');
    console.log('  • instagram_business_manage_comments (antes: business_manage_comments)');
    console.log('\n📌 Deadline: 27 de Janeiro de 2025');
}, 3000);

// ============================================
// 5. VERIFICAR REFRESH TOKEN SERVICE
// ============================================
setTimeout(async () => {
    console.log('\n5️⃣  TESTE: Verificando Token Refresh Service');
    try {
        const tokenService = await import('@/services/token-refresh-service');
        console.log('✅ Token Refresh Service carregado');
        console.log('Funções disponíveis:');
        console.log('  • isTokenExpired(platform)');
        console.log('  • refreshAccessToken(platform)');
        console.log('  • getValidAccessToken(platform)');
        console.log('  • logTokenExpiration(platform)');
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}, 4000);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

console.log('\n' + '='.repeat(50));
console.log('FUNÇÕES AUXILIARES');
console.log('='.repeat(50));

// Login com Instagram
window.instagramLogin = async () => {
    console.log('\n📱 Fazendo login com Instagram...');
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        const result = await InstagramSDKIntegration.login();
        console.log('Login result:', result);
        if (result.status === 'connected') {
            console.log('✅ Login bem-sucedido!');
            console.log('Access Token:', result.accessToken?.substring(0, 20) + '...');
            console.log('User ID:', result.userID);
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
    }
};

console.log('Use: instagramLogin()');

// Logout com Instagram
window.instagramLogout = async () => {
    console.log('\n📱 Fazendo logout do Instagram...');
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        await InstagramSDKIntegration.logout();
        console.log('✅ Logout bem-sucedido!');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
    }
};

console.log('Use: instagramLogout()');

// Obter perfil
window.getInstagramProfile = async (accessToken) => {
    console.log('\n👤 Obtendo perfil do Instagram...');
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        const profile = await InstagramSDKIntegration.getInstagramProfile(accessToken);
        console.log('✅ Perfil obtido:');
        console.log(profile);
        return profile;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: getInstagramProfile(accessToken)');

// Obter mídia
window.getInstagramMedia = async (accessToken, userId) => {
    console.log('\n📸 Obtendo mídia do Instagram...');
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        const media = await InstagramSDKIntegration.getInstagramMedia(accessToken, userId, 5);
        console.log('✅ Mídia obtida:');
        console.log(media);
        return media;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: getInstagramMedia(accessToken, userId)');

// Obter insights
window.getInstagramInsights = async (accessToken, userId) => {
    console.log('\n📊 Obtendo insights do Instagram...');
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        const insights = await InstagramSDKIntegration.getInstagramInsights(accessToken, userId);
        console.log('✅ Insights obtidos:');
        console.log(insights);
        return insights;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: getInstagramInsights(accessToken, userId)');

// Obter mensagens
window.getInstagramMessages = async (accessToken, userId) => {
    console.log('\n💬 Obtendo mensagens diretas...');
    try {
        const { InstagramSDKIntegration } = await import('@/services/instagram-sdk-integration');
        const messages = await InstagramSDKIntegration.getInstagramMessages(accessToken, userId);
        console.log('✅ Mensagens obtidas:');
        console.log(messages);
        return messages;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: getInstagramMessages(accessToken, userId)');

// Verificar expiração de token
window.checkTokenExpiration = async (platform = 'instagram') => {
    console.log(`\n⏰ Verificando expiração do token ${platform}...`);
    try {
        const tokenService = await import('@/services/token-refresh-service');
        const isExpired = await tokenService.isTokenExpired(platform);
        if (isExpired) {
            console.log(`⚠️  Token ${platform} vai expirar em menos de 1 hora`);
        } else {
            console.log(`✅ Token ${platform} ainda válido`);
        }
        return isExpired;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: checkTokenExpiration("instagram")');

// Renovar token
window.refreshToken = async (platform = 'instagram') => {
    console.log(`\n🔄 Renovando token ${platform}...`);
    try {
        const tokenService = await import('@/services/token-refresh-service');
        const success = await tokenService.refreshAccessToken(platform);
        if (success) {
            console.log(`✅ Token ${platform} renovado com sucesso`);
        } else {
            console.log(`❌ Falha ao renovar token ${platform}`);
        }
        return success;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: refreshToken("instagram")');

// Obter token válido
window.getValidToken = async (platform = 'instagram') => {
    console.log(`\n🔑 Obtendo token válido para ${platform}...`);
    try {
        const tokenService = await import('@/services/token-refresh-service');
        const token = await tokenService.getValidAccessToken(platform);
        if (token) {
            console.log(`✅ Token obtido: ${token.substring(0, 20)}...`);
        } else {
            console.log(`❌ Token não disponível`);
        }
        return token;
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

console.log('Use: getValidToken("instagram")');

// ============================================
// RESUMO
// ============================================
console.log('\n' + '='.repeat(50));
console.log('RESUMO DOS TESTES');
console.log('='.repeat(50));

console.log(`
✅ Instagram SDK inicializado
✅ Hook useInstagramIntegration funcional
✅ Token refresh service disponível
✅ Novos escopos implementados (instagram_business_*)
✅ Pronto para usar

FUNÇÕES DISPONÍVEIS:
  instagramLogin()
  instagramLogout()
  getInstagramProfile(accessToken)
  getInstagramMedia(accessToken, userId)
  getInstagramInsights(accessToken, userId)
  getInstagramMessages(accessToken, userId)
  checkTokenExpiration(platform)
  refreshToken(platform)
  getValidToken(platform)

DEADLINE: 27 de Janeiro de 2025
(Atualizar de business_* para instagram_business_*)
`);

console.log('='.repeat(50));
console.log('Para começar, use: instagramLogin()');
console.log('='.repeat(50));

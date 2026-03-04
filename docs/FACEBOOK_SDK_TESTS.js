// Arquivo de teste para validar a integração do Facebook SDK
// Coloque isso no console do navegador na página /admin/integrations

// ============================================
// 1. TESTAR INICIALIZAÇÃO DO SDK
// ============================================
console.log('=== TESTE 1: Inicializando Facebook SDK ===');

(async () => {
    try {
        const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
        await FacebookSDKIntegration.initialize();
        console.log('✅ Facebook SDK inicializado com sucesso');
        console.log('FB global:', typeof window.FB !== 'undefined');
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
    }
})();

// ============================================
// 2. TESTAR STATUS DE LOGIN
// ============================================
setTimeout(async () => {
    console.log('\n=== TESTE 2: Verificando Status de Login ===');
    try {
        const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
        const status = await FacebookSDKIntegration.getLoginStatus();
        console.log('✅ Status:', status);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}, 2000);

// ============================================
// 3. TESTAR HOOK useFacebookIntegration
// ============================================
setTimeout(async () => {
    console.log('\n=== TESTE 3: Testando Hook ===');
    try {
        const { useFacebookIntegration } = await import('@/hooks/useFacebookIntegration');
        const fb = useFacebookIntegration();
        console.log('✅ Hook carregado com sucesso');
        console.log('Métodos disponíveis:', Object.keys(fb));
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}, 4000);

// ============================================
// 4. VERIFICAR CONFIGURAÇÕES
// ============================================
console.log('\n=== TESTE 4: Configurações ===');
console.log('NEXT_PUBLIC_FACEBOOK_APP_ID:', process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);
console.log('FACEBOOK_APP_ID existe no servidor:', !!process.env.FACEBOOK_APP_ID);

// ============================================
// 5. TESTAR CHAMADA À API DO FACEBOOK
// ============================================
setTimeout(async () => {
    console.log('\n=== TESTE 5: Teste de API (após login) ===');
    try {
        const status = await window.FB?.getLoginStatus?.();
        if (status?.status === 'connected') {
            const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
            const userInfo = await FacebookSDKIntegration.getUserInfo();
            console.log('✅ Info do usuário:', userInfo);
        } else {
            console.log('⚠️ Usuário não está logado. Faça login primeiro.');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}, 6000);

// ============================================
// 6. TESTAR PÁGINAS DO USUÁRIO
// ============================================
setTimeout(async () => {
    console.log('\n=== TESTE 6: Páginas do Facebook ===');
    try {
        const status = await window.FB?.getLoginStatus?.();
        if (status?.status === 'connected') {
            const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
            const pages = await FacebookSDKIntegration.getUserPages();
            console.log('✅ Páginas:', pages);
        } else {
            console.log('⚠️ Usuário não está logado. Faça login primeiro.');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}, 8000);

// ============================================
// TESTE MANUAL: Botão para fazer login
// ============================================
console.log('\n=== FUNÇÃO AUXILIAR: facebookLogin() ===');
window.facebookLogin = async () => {
    try {
        const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
        const result = await FacebookSDKIntegration.login('email,public_profile,pages_read_engagement,pages_show_list');
        console.log('Login result:', result);
        if (result.status === 'connected') {
            console.log('✅ Login bem-sucedido!');
            const userInfo = await FacebookSDKIntegration.getUserInfo();
            console.log('User Info:', userInfo);
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
    }
};

console.log('Use facebookLogin() para fazer login com Facebook');

// ============================================
// TESTE MANUAL: Botão para fazer logout
// ============================================
window.facebookLogout = async () => {
    try {
        const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
        await FacebookSDKIntegration.logout();
        console.log('✅ Logout bem-sucedido!');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
    }
};

console.log('Use facebookLogout() para fazer logout');

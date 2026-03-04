import { ServiceResponse, UserData } from '../types';

// Simulating network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Database
const MOCK_USERS: UserData[] = [
  { id: 'usr_001', email: 'cliente.vip@exemplo.com', status: 'active', subscription: 'vip', lastLogin: '2023-10-25' },
  { id: 'usr_002', email: 'novo.usuario@exemplo.com', status: 'pending', subscription: 'free', lastLogin: '2023-10-26' },
  { id: 'usr_003', email: 'suspenso@exemplo.com', status: 'suspended', subscription: 'free', lastLogin: '2023-09-10' },
];

export const Microservices = {
  // 1. delete-auth-user-service
  deleteAuthUser: async (userId: string): Promise<ServiceResponse> => {
    await delay(1000);
    return { success: true, message: `Usuário de autenticação ${userId} removido com sucesso.` };
  },

  // 2. delete-user-data-service
  deleteUserData: async (userId: string): Promise<ServiceResponse> => {
    await delay(1500);
    return { success: true, message: `Todos os dados pessoais do usuário ${userId} foram apagados.` };
  },

  // 3. search-user-data-service
  searchUserData: async (query: string): Promise<ServiceResponse> => {
    await delay(800);
    const results = MOCK_USERS.filter(u => 
      u.email.includes(query) || u.id.includes(query)
    );
    return { 
      success: true, 
      message: `Encontrados ${results.length} usuários.`,
      data: results 
    };
  },

  // 4. grant-free-days-service
  grantFreeDays: async (userId: string, days: number): Promise<ServiceResponse> => {
    await delay(1000);
    return { success: true, message: `Concedidos ${days} dias grátis para o usuário ${userId}.` };
  },

  // 5. send-password-reset-service
  sendPasswordReset: async (email: string): Promise<ServiceResponse> => {
    await delay(1000);
    return { success: true, message: `Email de redefinição de senha enviado para ${email}.` };
  },

  // 6. activate-subscription-service
  activateSubscription: async (userId: string, plan: string): Promise<ServiceResponse> => {
    await delay(1200);
    return { success: true, message: `Assinatura '${plan}' ativada para o usuário ${userId}.` };
  },

  // 7. update-user-service
  updateUser: async (userId: string, data: any): Promise<ServiceResponse> => {
    await delay(1000);
    return { success: true, message: `Dados do usuário ${userId} atualizados com sucesso.` };
  },

  // 8. clear-data-external-service
  clearDataExternal: async (serviceId: string): Promise<ServiceResponse> => {
    await delay(2000);
    return { success: true, message: `Cache e dados temporários do serviço externo '${serviceId}' limpos.` };
  },

  // 9. agendamento
  scheduleService: async (userId: string, date: string, type: string): Promise<ServiceResponse> => {
    await delay(1500);
    return { success: true, message: `Agendamento de '${type}' confirmado para ${date}.` };
  },

  // 10. change-page-color-service
  changePageColor: async (colorType: string, colorValue: string): Promise<ServiceResponse> => {
    await delay(800);
    // Update CSS variables or Tailwind config dynamically
    const root = document.documentElement;
    const colorMap: { [key: string]: string } = {
      'velvet-black': '--color-velvet-black',
      'velvet-dark': '--color-velvet-dark',
      'velvet-card': '--color-velvet-card',
      'velvet-red': '--color-velvet-red',
      'velvet-red-hover': '--color-velvet-red-hover',
    };
    
    if (colorMap[colorType]) {
      root.style.setProperty(colorMap[colorType], colorValue);
      return { success: true, message: `Cor '${colorType}' alterada para ${colorValue}.` };
    }
    return { success: false, message: `Tipo de cor '${colorType}' não encontrado.` };
  },

  // 11. upload-image-service
  uploadImage: async (source: string, sourceType: 'url' | 'file'): Promise<ServiceResponse> => {
    await delay(1200);
    // Simulate image upload/validation
    if (sourceType === 'url') {
      // Validate URL format
      try {
        new URL(source);
        return { 
          success: true, 
          message: `Imagem carregada com sucesso via URL.`,
          data: { imageUrl: source }
        };
      } catch {
        return { success: false, message: `URL inválida.` };
      }
    } else {
      // Simulate file upload
      return { 
        success: true, 
        message: `Imagem enviada com sucesso.`,
        data: { imageUrl: `https://placeholder.com/uploaded/${Date.now()}.jpg` }
      };
    }
  },

  // 12. change-background-image-service
  changeBackgroundImage: async (imageUrl: string): Promise<ServiceResponse> => {
    await delay(800);
    // Apply background image to body or specific container
    const root = document.documentElement;
    root.style.setProperty('--background-image', `url(${imageUrl})`);
    return { 
      success: true, 
      message: `Imagem de fundo atualizada com sucesso.`,
      data: { imageUrl }
    };
  }
};

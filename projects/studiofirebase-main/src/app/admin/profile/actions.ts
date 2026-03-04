"use server";

export interface PersonalData {
    // Dados Pessoais
    name: string;
    phone: string;
    email: string;
    address: string;
    description: string;
    
    // Dados Bancários
    bankAccount: {
        bank: string;
        agency: string;
        account: string;
        accountType: string;
        pixKey: string;
    };
    
    // Redes Sociais
    socialMedia: {
        instagram: string;
        twitter: string;
        youtube: string;
        telegram: string;
    };
    
    // Imagens
    profileImage: string;
    bannerImage: string;
}

export async function getPersonalData(): Promise<PersonalData> {
    // Simulated data - in production this would fetch from database
    return {
        name: "Italo Santos",
        phone: "5521990479104", 
        email: "pix@italosantos.com",
        address: "Avenida Paulista, São Paulo, SP, Brasil",
        description: "Descrição profissional aqui...",
        bankAccount: {
            bank: "Banco do Brasil",
            agency: "1234-5",
            account: "12345-6",
            accountType: "Conta Corrente",
            pixKey: "pix@italosantos.com"
        },
        socialMedia: {
            instagram: "@italosantos",
            twitter: "@italosantos",
            youtube: "@italosantos",
            telegram: "@italosantos"
        },
        profileImage: "",
        bannerImage: ""
    };
}

export async function savePersonalData(data: PersonalData): Promise<{ success: boolean; message: string }> {
    try {
        // In production, this would save to database
        console.log('Saving personal data:', data);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            message: "Dados salvos com sucesso!"
        };
    } catch (error) {
        console.error('Error saving personal data:', error);
        return {
            success: false,
            message: "Erro ao salvar dados. Tente novamente."
        };
    }
}
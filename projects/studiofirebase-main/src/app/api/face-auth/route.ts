import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

const VIP_URL = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/galeria-assinantes`;

interface FaceAuthRequest {
  action: 'register' | 'checkUser' | 'login' | 'checkPayment' | 'updateSubscription';
  nome?: string;
  email?: string;
  telefone?: string;
  image?: string;
  video?: string;
  customerEmail?: string;
  paymentId?: string;
  subscriptionType?: string;
  subscriptionDuration?: number; // em meses
}

const USERS_COLLECTION = 'users';

async function registerUser(data: FaceAuthRequest) {
  if (!data.nome || !data.email || !data.telefone) {
    return { success: false, message: "Dados do formulário inválidos." };
  }
  try {
    await addDoc(collection(db, USERS_COLLECTION), {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      image: data.image || '',
      video: data.video || '',
      createdAt: new Date().toISOString(),
      paymentId: '',
      isSubscriber: false,
      subscriptionType: '', // 'monthly', 'yearly', etc.
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      lastLogin: null
    });
    return { success: true, message: "Novo usuário registrado com sucesso." };
  } catch (error) {
    return { success: false, message: `Ocorreu um erro no servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

async function checkExistingUser(data: FaceAuthRequest) {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    // Verificar email
    if (data.email) {
      const q = query(usersRef, where('email', '==', data.email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { success: false, message: "Email já cadastrado." };
      }
    }
    // Verificar telefone
    if (data.telefone) {
      const q = query(usersRef, where('telefone', '==', data.telefone));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { success: false, message: "Telefone já cadastrado." };
      }
    }
    // Verificar imagem
    if (data.image) {
      const q = query(usersRef, where('image', '>=', data.image.substring(0, 100)));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { success: false, message: "Rosto já cadastrado." };
      }
    }
    return { success: true, message: "Dados únicos, pode cadastrar." };
  } catch (error) {
    return { success: false, message: `Erro ao verificar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

async function verifyUserLogin(data: FaceAuthRequest) {
  try {
    if (!data.image) {
      return { success: false, message: "Imagem não fornecida para verificação." };
    }
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('image', '>=', data.image.substring(0, 100)));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      
      // Atualizar último login
      await updateDoc(userDoc.ref, {
        lastLogin: new Date().toISOString()
      });
      
      // Verificar se é assinante ativo
      const isActiveSubscriber = user.isSubscriber && 
        user.subscriptionEndDate && 
        new Date(user.subscriptionEndDate) > new Date();
      
      return {
        success: true,
        message: "Usuário autenticado!",
        redirectUrl: isActiveSubscriber ? '/assinante' : VIP_URL,
        userEmail: user.email,
        userName: user.nome,
        isSubscriber: isActiveSubscriber,
        subscriptionType: user.subscriptionType || '',
        hasPayment: !!user.paymentId
      };
    }
    return { success: false, message: "Usuário não reconhecido." };
  } catch (error) {
    return { success: false, message: `Erro no login: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

async function checkPaymentStatus(customerEmail: string) {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', customerEmail), where('paymentId', '!=', ''));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const user = snapshot.docs[0].data();
      const isActiveSubscriber = user.isSubscriber && 
        user.subscriptionEndDate && 
        new Date(user.subscriptionEndDate) > new Date();
      return { 
        success: true, 
        message: "Pagamento identificado.",
        isSubscriber: isActiveSubscriber,
        subscriptionType: user.subscriptionType || ''
      };
    }
    return { success: false, message: "Pagamento não identificado." };
  } catch (error) {
    return { success: false, message: `Erro ao verificar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

async function updateSubscription(data: FaceAuthRequest) {
  try {
    if (!data.customerEmail || !data.paymentId) {
      return { success: false, message: "Email e ID de pagamento são obrigatórios." };
    }
    
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', data.customerEmail));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (data.subscriptionDuration || 1));
      
      await updateDoc(userDoc.ref, {
        paymentId: data.paymentId,
        isSubscriber: true,
        subscriptionType: data.subscriptionType || 'monthly',
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return { 
        success: true, 
        message: "Assinatura ativada com sucesso!",
        subscriptionEndDate: endDate.toISOString()
      };
    }
    return { success: false, message: "Usuário não encontrado." };
  } catch (error) {
    return { success: false, message: `Erro ao atualizar assinatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: FaceAuthRequest = await request.json();
    let result;
    switch (data.action) {
      case 'register':
        result = await registerUser(data);
        break;
      case 'checkUser':
        result = await checkExistingUser(data);
        break;
      case 'login':
        result = await verifyUserLogin(data);
        break;
      case 'checkPayment':
        result = await checkPaymentStatus(data.customerEmail || '');
        break;
      case 'updateSubscription':
        result = await updateSubscription(data);
        break;
      default:
        result = { success: false, message: "Ação não reconhecida." };
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Remover token do Firestore
    const configRef = db.collection('config').doc('instagram');
    await configRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Desconectado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao desconectar Instagram:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

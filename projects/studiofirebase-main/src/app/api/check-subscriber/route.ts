import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { resolveAdminUidByUsernameServer } from '@/lib/admin-username-resolver';

export async function POST(request: NextRequest) {
  try {
    const { email, userId, publicUsername, adminUid: rawAdminUid } = await request.json();

    const scopedAdminUid: string | null =
      (typeof rawAdminUid === 'string' && rawAdminUid.trim() ? rawAdminUid.trim() : null) ||
      (await resolveAdminUidByUsernameServer(publicUsername));

    console.log(`[Check Subscriber API] Verificando assinatura para email: ${email}, userId: ${userId}`);

    if (!email && !userId) {
      return NextResponse.json({
        success: false,
        message: 'Email ou userId é obrigatório'
      });
    }

    const adminDb = getAdminDb();
    // 1. Verificar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      try {
        const usersRef = adminDb.collection('users');
        let userQuery;

        if (email) {
          userQuery = await usersRef.where('email', '==', email).get();
        } else if (userId) {
          userQuery = await usersRef.where('uid', '==', userId).get();
        }

        if (userQuery && !userQuery.empty) {
          const userDoc = scopedAdminUid
            ? (userQuery.docs.find((d) => (d.data() as any)?.adminUid === scopedAdminUid) ?? null)
            : userQuery.docs[0];

          if (userDoc) {
            const userData = userDoc.data();

            console.log(`[Check Subscriber API] User data:`, userData);

            // Verificar se tem isSubscriber ou subscriptionStatus
            if (userData?.isSubscriber === true || userData?.subscriptionStatus === 'active') {
              console.log(`[Check Subscriber API] Usuário encontrado como assinante ativo no perfil`);

              return NextResponse.json({
                success: true,
                isSubscriber: true,
                isVip: true, // Assumindo que assinante = VIP
                subscriber: {
                  email: userData.email,
                  name: userData.displayName || userData.name,
                  planType: userData.planId || 'monthly',
                  subscriptionEndDate: userData.subscriptionEndDate || userData.expiresAt,
                  subscriptionStartDate: userData.subscriptionStartDate || userData.createdAt,
                  paymentMethod: userData.paymentMethod || 'pix'
                },
                message: 'Assinatura ativa encontrada'
              });
            }
          }
        }
      } catch (error) {
        console.error('[Check Subscriber API] Erro ao verificar perfil do usuário:', error);
      }
    }

    // 2. Verificar na coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      try {
        const subscribersRef = adminDb.collection('subscribers');
        let subscriberSnapshot;

        if (email) {
          subscriberSnapshot = await subscribersRef
            .where('email', '==', email)
            .get();
        } else if (userId) {
          subscriberSnapshot = await subscribersRef
            .where('userId', '==', userId)
            .get();
        }

        console.log(`[Check Subscriber API] Firestore subscribers encontrados: ${subscriberSnapshot?.size || 0}`);

        if (subscriberSnapshot && !subscriberSnapshot.empty) {
          const activeDocs = subscriberSnapshot.docs.filter((d) => (d.data() as any)?.status === 'active');
          const subscriberDoc = scopedAdminUid
            ? (activeDocs.find((d) => (d.data() as any)?.adminUid === scopedAdminUid) ?? null)
            : activeDocs[0];

          if (subscriberDoc) {
            const subscriberData = subscriberDoc.data();

            console.log(`[Check Subscriber API] Usuário encontrado como assinante ativo no Firestore`);

            return NextResponse.json({
              success: true,
              isSubscriber: true,
              isVip: true, // Assumindo que assinante = VIP
              subscriber: {
                email: subscriberData.email,
                name: subscriberData.name,
                planType: subscriberData.planId || 'monthly',
                subscriptionEndDate: subscriberData.endDate || subscriberData.expiresAt,
                subscriptionStartDate: subscriberData.startDate || subscriberData.createdAt,
                paymentMethod: subscriberData.paymentMethod || 'pix'
              },
              message: 'Assinatura ativa encontrada'
            });
          }
        }
      } catch (error) {
        console.error('[Check Subscriber API] Erro ao verificar Firestore:', error);
      }
    }

    // 3. Verificar na coleção 'subscriptions' (Realtime Database - backup)
    const adminApp = getAdminApp();
    if (adminApp) {
      try {
        const rtdb = getDatabase(adminApp);
        let userRef;

        if (userId) {
          userRef = rtdb.ref(`users/${userId}/subscription`);
        } else if (email) {
          // Buscar por email no RTDB (menos eficiente)
          const usersRef = rtdb.ref('users');
          const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
          const userData = snapshot.val();
          
          if (userData) {
            const userIdFromEmail = Object.keys(userData)[0];
            userRef = rtdb.ref(`users/${userIdFromEmail}/subscription`);
          }
        }

        if (userRef) {
          const subscriptionSnapshot = await userRef.once('value');
          const subscriptionId = subscriptionSnapshot.val();

          if (subscriptionId) {
            const subscriptionRef = rtdb.ref(`subscriptions/${subscriptionId}`);
            const subscriptionDataSnapshot = await subscriptionRef.once('value');
            const subscriptionData = subscriptionDataSnapshot.val();

            if (subscriptionData?.status === 'active') {
              const hasAdminInRecord = Boolean(subscriptionData.adminUid);
              const matchesAdmin = !scopedAdminUid || subscriptionData.adminUid === scopedAdminUid;

              // Se está escopado por admin, não aceitar records legacy (sem adminUid)
              if (scopedAdminUid && !hasAdminInRecord) {
                // ignore
              } else if (matchesAdmin) {
                const now = new Date();
                const endDate = new Date(subscriptionData.endDate);

                if (endDate > now) {
                  console.log(`[Check Subscriber API] Usuário encontrado como assinante ativo no RTDB`);

                  return NextResponse.json({
                    success: true,
                    isSubscriber: true,
                    isVip: true,
                    subscriber: {
                      email: subscriptionData.email,
                      name: subscriptionData.name,
                      planType: subscriptionData.planId || 'monthly',
                      subscriptionEndDate: subscriptionData.endDate,
                      subscriptionStartDate: subscriptionData.startDate,
                      paymentMethod: subscriptionData.paymentMethod || 'pix'
                    },
                    message: 'Assinatura ativa encontrada'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[Check Subscriber API] Erro ao verificar RTDB:', error);
      }
    }

    // Nenhuma assinatura ativa encontrada
    console.log(`[Check Subscriber API] Nenhuma assinatura ativa encontrada`);

    return NextResponse.json({
      success: true,
      isSubscriber: false,
      isVip: false,
      subscriber: null,
      message: 'Nenhuma assinatura ativa encontrada'
    });

  } catch (error) {
    console.error('[Check Subscriber API] Erro geral:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

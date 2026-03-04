import { NextRequest, NextResponse } from 'next/server';
import {
  getProfileSettings,
  saveProfileSettings,
  ProfileSettings
} from '@/app/admin/settings/actions';
import {
  DEFAULT_PROFILE_IMAGE,
  DEFAULT_COVER_IMAGE
} from '@/app/admin/settings/image-helpers';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { SUPERADMIN_USERNAME } from '@/lib/superadmin-config';

function sanitizePublicProfileSettings(settings: ProfileSettings): ProfileSettings {
  // Remove secrets that should never reach browsers.
  const paymentSettings = settings.paymentSettings
    ? {
      ...settings.paymentSettings,
      paypalClientSecret: undefined,
      mercadoPagoAccessToken: undefined,
    }
    : undefined;

  return {
    ...settings,
    paymentSettings,
  };
}

/**
 * Verifica se o username é do SuperAdmin (severepics)
 * O SuperAdmin usa admin/profileSettings (global) em vez de perfil individual
 */
function isSuperAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.toLowerCase().trim() === SUPERADMIN_USERNAME;
}

function buildDefaultSettings(): ProfileSettings {
  return {
    name: '',
    phone: '',
    email: '',
    address: '',
    profilePictureUrl: DEFAULT_PROFILE_IMAGE,
    coverPhotoUrl: DEFAULT_COVER_IMAGE,
    galleryPhotos: []
  };
}

async function resolveAdminUidByUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;
  // Se é SuperAdmin, retornar null para usar perfil global
  if (isSuperAdminUsername(normalized)) {
    console.log('[API] Username é SuperAdmin (severepics) - usando perfil global');
    return null;
  }

  const adminDb = getAdminDb();
  if (!adminDb) return null;

  const snap = await adminDb
    .collection('admins')
    .where('username', '==', normalized)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedAdminUid = searchParams.get('adminUid') || undefined;
    const requestedUsername = searchParams.get('username') || undefined;
    // Flag para indicar explicitamente uso do perfil global
    // Quando adminUid não é fornecido em chamada autenticada, usar global
    const useGlobal = searchParams.get('global') === 'true';

    const hasBearer = (request.headers.get('authorization') || '').startsWith('Bearer ');
    const authResult = hasBearer ? await requireAdminApiAuth(request) : null;
    if (authResult instanceof NextResponse) return authResult;

    let effectiveAdminUid: string | undefined = requestedAdminUid;

    // 1) Se pedir explicitamente adminUid: exige permissão
    if (requestedAdminUid) {
      if (!authResult) {
        return NextResponse.json({ success: false, message: 'Token Bearer ausente' }, { status: 401 });
      }

      if (authResult.uid !== requestedAdminUid && !authResult.adminDoc?.isMainAdmin) {
        return NextResponse.json({ success: false, message: 'Acesso negado' }, { status: 403 });
      }
    }

    /**
     * LÓGICA DE ROTEAMENTO:
     * 
     * 1. adminUid fornecido → usar perfil individual (admins/{uid}/profile/settings)
     * 2. adminUid NÃO fornecido + auth → usar perfil individual por padrão
     *    - global só com superadmin ou global=true autorizado
     * 3. Sem auth + username → resolver uid pelo username
     * 4. Sem auth + sem username → usar global (página pública)
     */

    // 2) Se não veio adminUid mas temos auth:
    //    - Por padrão, SEMPRE usar o perfil individual do admin logado.
    //    - O perfil global (admin/profileSettings) só deve ser usado quando:
    //        a) o admin for o SuperAdmin, OU
    //        b) a request pedir explicitamente `global=true` e o admin tiver permissão.
    // Isso evita que novos admins (muitas vezes com isMainAdmin incorreto/indefinido) caiam no fallback global.
    if (!effectiveAdminUid && authResult) {
      const isMainAdmin = Boolean(authResult.adminDoc?.isMainAdmin);
      const isSuperAdmin = isSuperAdminUsername(authResult.adminDoc?.username || '');
      if (useGlobal) {
        if (!isSuperAdmin && !isMainAdmin) {
          return NextResponse.json({ success: false, message: 'Acesso negado' }, { status: 403 });
        }
        console.log('[API] global=true solicitado - usando perfil global (admin/profileSettings)');
        // effectiveAdminUid permanece undefined → usa global
      } else if (isSuperAdmin) {
        console.log('[API] SuperAdmin - usando perfil global (admin/profileSettings)');
        // effectiveAdminUid permanece undefined → usa global
      } else {
        effectiveAdminUid = authResult.uid;
      }
    }

    // 3) Se não veio adminUid e NÃO há auth (página pública), permitir buscar por username.
      // Isso habilita URLs como /api/admin/profile-settings?username=italo
      if (!effectiveAdminUid && !authResult && requestedUsername) {
        if (isSuperAdminUsername(requestedUsername)) {
          // SuperAdmin: usar perfil global (effectiveAdminUid permanece undefined)
        } else {
          const resolvedUid = await resolveAdminUidByUsername(requestedUsername);
          if (resolvedUid) {
            effectiveAdminUid = resolvedUid;
          } else {
            // Username de UID não encontrado no sistema – retornar defaults isolados,
            // nunca o perfil global.
            return NextResponse.json(buildDefaultSettings(), {
              headers: {
                'Cache-Control': 'no-store, max-age=0',
                'Content-Type': 'application/json',
              },
            });
          }
        }
      }

      /**
       * FALLBACK PARA SUPERADMIN (pix@italosantos.com):
       * 
       * Se effectiveAdminUid ainda for undefined, significa que:
       * - Não há adminUid explícito
       * - Não há auth (página pública)
       * - Não há username na query
       * 
       * Neste caso, usamos as configurações GLOBAIS do SuperAdmin
       * armazenadas em: admin/profileSettings
       * 
       * Este é o fallback padrão para homepage e páginas públicas sem contexto.
       */
      const scope = effectiveAdminUid
        ? `admin: ${effectiveAdminUid}`
        : 'global (SuperAdmin pix@italosantos.com - admin/profileSettings)';
      console.log(`[API] Buscando configurações para ${scope}`);
      const settings = await getProfileSettings(effectiveAdminUid);
      console.log('[API] Configurações encontradas:', settings ? 'Sim' : 'Não');
      if (!settings) {
        // Retornar configurações padrão se não existirem
        return NextResponse.json(buildDefaultSettings(), {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Content-Type': 'application/json',
          },
        });
      }

      const safeSettings = authResult ? settings : sanitizePublicProfileSettings(settings);

      return NextResponse.json(safeSettings, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error fetching profile settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile settings' },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

export async function POST(request: NextRequest) {
    try {
      const authResult = await requireAdminApiAuth(request);
      if (authResult instanceof NextResponse) return authResult;

      const body = await request.json();
      const { settings, adminUid } = body as { settings: ProfileSettings; adminUid?: string };

      const isSuperAdmin = isSuperAdminUsername(authResult.adminDoc?.username || '');
      if (adminUid && authResult.uid !== adminUid && !authResult.adminDoc?.isMainAdmin) {
        return NextResponse.json({ success: false, message: 'Acesso negado' }, { status: 403 });
      }

      // Admins não-superadmin não devem salvar no perfil global.
      // Se adminUid não foi fornecido e o usuário não é SuperAdmin, usar o próprio UID.
      const effectiveUid: string | undefined = adminUid ?? (isSuperAdmin ? undefined : authResult.uid);

      await saveProfileSettings(settings, effectiveUid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error saving profile settings:', error);
      return NextResponse.json(
        { error: 'Failed to save profile settings' },
        { status: 500 }
      );
    }
  }

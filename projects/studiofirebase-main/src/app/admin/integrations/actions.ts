'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export type Integration = "google" | "apple" | "twitter" | "instagram" | "facebook" | "mercadopago" | "paypal" | "stripe";

function getIntegrationsRef(adminUid: string | null | undefined) {
  const uid = (adminUid || '').trim();
  if (!uid) return null;
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const db = getDatabase(adminApp as any);
  return db.ref(`admin/integrations/${uid}`);
}

// Overload for getIntegrationStatus to provide better types
export async function getIntegrationStatus(adminUid: string, service: 'twitter'): Promise<{ connected: boolean; screen_name?: string }>;
export async function getIntegrationStatus(adminUid: string, service: Exclude<Integration, 'twitter'>): Promise<boolean>;
export async function getIntegrationStatus(adminUid: string, service: Integration): Promise<boolean | { connected: boolean; screen_name?: string }> {
  const integrationsRef = getIntegrationsRef(adminUid);
  if (!integrationsRef) {
    console.error("Admin SDK not available - cannot check integration status");
    return service === 'twitter' ? { connected: false } : false;
  }

  try {
    const snapshot = await integrationsRef.child(service).once('value');
    const data = snapshot.val();

    if (!data) {
      return service === 'twitter' ? { connected: false } : false;
    }

    if (service === 'twitter') {
      return { connected: !!data.connected, screen_name: data.screen_name };
    }

    // For services that store an object (like openid)
    if (typeof data === 'object' && data !== null) {
      return data.connected === true;
    }

    // For services that store a simple boolean
    return data === true;

  } catch (error: any) {
    console.error(`Error getting status for ${service}:`, error);
    return service === 'twitter' ? { connected: false } : false;
  }
}

export async function disconnectService(service: Integration): Promise<{ success: boolean; message: string }> {
  // Mantido por compatibilidade: não executar sem um adminUid explícito.
  return { success: false, message: "Admin UID é obrigatório para desconectar integrações." };
}

export async function disconnectServiceForAdmin(adminUid: string, service: Integration): Promise<{ success: boolean; message: string }> {
  const integrationsRef = getIntegrationsRef(adminUid);
  if (!integrationsRef) {
    return { success: false, message: "System configuration not available." };
  }

  try {
    const updateValue = (service === 'twitter' || service === 'mercadopago' || service === 'paypal' || service === 'stripe') ? null : false;
    await integrationsRef.child(service).set(updateValue);
    return { success: true, message: `${service} disconnected successfully.` };
  } catch (error: any) {
    console.error(`[integrations] Failed to disconnect ${service} for admin ${adminUid}:`, error);
    return { success: false, message: `Failed to disconnect ${service}.` };
  }
}

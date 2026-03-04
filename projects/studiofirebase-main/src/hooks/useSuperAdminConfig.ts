/**
 * Hook useSuperAdminConfig (Simplificado)
 * 
 * ⚠️ O SuperAdmin NÃO usa UID - sempre carrega de admin/profileSettings
 */

import { useState, useEffect } from 'react';
import {
  getSuperAdminConfig,
  updateSuperAdminConfig,
  type SuperAdminConfig,
} from '@/lib/superadmin-config';

interface UseSuperAdminConfigReturn {
  config: SuperAdminConfig | null;
  isLoading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<SuperAdminConfig>) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

export function useSuperAdminConfig(): UseSuperAdminConfigReturn {
  const [config, setConfig] = useState<SuperAdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useSuperAdminConfig] Carregando config do SuperAdmin...');

      const result = await getSuperAdminConfig();

      if (!result) {
        setError('Config do SuperAdmin não encontrada');
        console.warn('[useSuperAdminConfig] ⚠️ Config não encontrada');
      } else {
        setConfig(result);
        console.log('[useSuperAdminConfig] ✅ Config carregada');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar config';
      setError(message);
      console.error('[useSuperAdminConfig] ❌ Erro:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<SuperAdminConfig>) => {
    try {
      console.log('[useSuperAdminConfig] Atualizando config...');

      await updateSuperAdminConfig(updates);

      // Atualizar estado local
      setConfig((prev) => (prev ? { ...prev, ...updates } : null));

      console.log('[useSuperAdminConfig] ✅ Config atualizada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar config';
      setError(message);
      console.error('[useSuperAdminConfig] ❌ Erro:', err);
      throw err;
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  return {
    config,
    isLoading,
    error,
    updateConfig,
    refreshConfig,
  };
}

/**
 * Hook para apenas ler config do SuperAdmin (read-only)
 */
export function useSuperAdminConfigRead(): {
  config: SuperAdminConfig | null;
  isLoading: boolean;
  error: string | null;
} {
  const [config, setConfig] = useState<SuperAdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getSuperAdminConfig();
      setConfig(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar config';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    config,
    isLoading,
    error,
  };
}

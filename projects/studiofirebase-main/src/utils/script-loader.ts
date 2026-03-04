/**
 * Utilitário para carregamento seguro de scripts externos
 * Evita duplicação e problemas de removeChild
 */

interface ScriptLoadOptions {
  src: string;
  id?: string;
  async?: boolean;
  defer?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  attributes?: Record<string, string>;
}

export const loadScript = (options: ScriptLoadOptions): Promise<HTMLScriptElement> => {
  return new Promise((resolve, reject) => {
    const { src, id, async = true, defer = false, onLoad, onError, attributes = {} } = options;

    // Verificar se o script já existe
    const existingScript = id 
      ? document.getElementById(id) as HTMLScriptElement
      : document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;

    if (existingScript) {
      // Script já existe, apenas executar callback se necessário
      if (onLoad) {
        onLoad();
      }
      resolve(existingScript);
      return;
    }

    try {
      // Criar novo script
      const script = document.createElement('script');
      script.src = src;
      script.async = async;
      script.defer = defer;

      if (id) {
        script.id = id;
      }

      // Adicionar atributos personalizados
      Object.entries(attributes).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });

      // Configurar eventos
      script.onload = () => {
        if (onLoad) {
          onLoad();
        }
        resolve(script);
      };

      script.onerror = (error) => {
        const err = new Error(`Erro ao carregar script: ${src}`);
        if (onError) {
          onError(err);
        }
        reject(err);
      };

      // Adicionar ao DOM
      document.head.appendChild(script);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido ao carregar script');
      if (onError) {
        onError(err);
      }
      reject(err);
    }
  });
};

/**
 * Remove script com segurança
 */
export const removeScript = (scriptOrId: HTMLScriptElement | string): boolean => {
  try {
    let script: HTMLScriptElement | null = null;

    if (typeof scriptOrId === 'string') {
      script = document.getElementById(scriptOrId) as HTMLScriptElement;
    } else {
      script = scriptOrId;
    }

    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Erro ao remover script:', error);
    return false;
  }
};

/**
 * Verifica se um script já foi carregado
 */
export const isScriptLoaded = (srcOrId: string): boolean => {
  try {
    // Verificar por ID
    if (document.getElementById(srcOrId)) {
      return true;
    }

    // Verificar por src
    if (document.querySelector(`script[src="${srcOrId}"]`)) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Erro ao verificar script:', error);
    return false;
  }
};

/**
 * Hook React para carregamento de scripts
 */
import { useEffect, useState } from 'react';

export const useScript = (options: ScriptLoadOptions) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isScriptLoaded(options.src)) {
      setIsLoaded(true);
      setIsLoading(false);
      if (options.onLoad) {
        options.onLoad();
      }
      return;
    }

    loadScript({
      ...options,
      onLoad: () => {
        setIsLoaded(true);
        setIsLoading(false);
        if (options.onLoad) {
          options.onLoad();
        }
      },
      onError: (err) => {
        setError(err);
        setIsLoading(false);
        if (options.onError) {
          options.onError(err);
        }
      }
    }).catch((err) => {
      setError(err);
      setIsLoading(false);
    });
  }, [options.src]); // options é complexo e options.src já monitora mudanças principais

  return { isLoaded, error, isLoading };
};

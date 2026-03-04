/**
 * Crypto Helpers para PKCE e OAuth
 * Funções de criptografia e geração de códigos seguros
 */

/**
 * Gera uma string aleatória segura
 * @param length - Comprimento da string (43-128 para PKCE)
 * @returns String aleatória com caracteres seguros
 */
export function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';

    if (typeof window !== 'undefined' && window.crypto) {
        // Browser: usar Web Crypto API
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
            result += charset[randomValues[i] % charset.length];
        }
    } else {
        // Node.js/fallback: usar Math.random (menos seguro)
        for (let i = 0; i < length; i++) {
            result += charset[Math.floor(Math.random() * charset.length)];
        }
    }

    return result;
}

/**
 * Calcula SHA256 de uma string
 * @param plain - String para hash
 * @returns ArrayBuffer com o hash SHA256
 */
export async function sha256(plain: string): Promise<ArrayBuffer> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // Browser: usar Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return await window.crypto.subtle.digest('SHA-256', data);
    } else {
        // Node.js: usar crypto nativo
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        hash.update(plain);
        return hash.digest();
    }
}

/**
 * Converte ArrayBuffer para Base64 URL-safe
 * @param buffer - ArrayBuffer para converter
 * @returns String Base64 URL-safe
 */
export function base64UrlEncode(buffer: ArrayBuffer): string {
    // Converter ArrayBuffer para string base64
    let base64: string;

    if (typeof window !== 'undefined') {
        // Browser
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        base64 = btoa(binary);
    } else {
        // Node.js
        const bytes = Buffer.from(buffer);
        base64 = bytes.toString('base64');
    }

    // Converter para URL-safe: trocar caracteres especiais
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Gera um par PKCE completo (verifier + challenge)
 * Função auxiliar que combina todas as operações
 */
export async function generatePKCEPair(): Promise<{
    verifier: string;
    challenge: string;
    method: 'S256';
}> {
    const verifier = generateRandomString(128);
    const hash = await sha256(verifier);
    const challenge = base64UrlEncode(hash);

    return {
        verifier,
        challenge,
        method: 'S256',
    };
}

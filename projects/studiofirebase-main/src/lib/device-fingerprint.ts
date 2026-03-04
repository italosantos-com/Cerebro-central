/**
 * Device Fingerprint Utility
 * Generates a unique device ID for fraud prevention
 * Used with MercadoPago payments to improve approval rates
 */

export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    // Server-side: return a placeholder
    return 'server-side';
  }

  try {
    // Collect device information (excluding timestamp for stability)
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Create a stable hash from device info
    const deviceString = JSON.stringify(deviceInfo);
    let hash = 0;
    
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate a stable device ID (hash part is consistent, timestamp for uniqueness if needed)
    const deviceId = `device_${Math.abs(hash).toString(36)}`;
    
    // Store in sessionStorage for consistency across same session
    try {
      sessionStorage.setItem('mp_device_id', deviceId);
    } catch (e) {
      // Ignore storage errors
    }

    return deviceId;
  } catch (error) {
    console.warn('[Device Fingerprint] Error generating fingerprint:', error);
    return `device_${Date.now().toString(36)}`;
  }
}

export function getStoredDeviceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return sessionStorage.getItem('mp_device_id');
  } catch (e) {
    return null;
  }
}

export function getOrCreateDeviceId(): string {
  const stored = getStoredDeviceId();
  if (stored) {
    return stored;
  }
  return generateDeviceFingerprint();
}

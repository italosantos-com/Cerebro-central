// Removed: import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Helper to validate Brazilian national numbers (AA + subscriber)
function isValidBRNational(n: string): boolean {
    if (!/^\d+$/.test(n)) return false;
    if (n.length !== 10 && n.length !== 11) return false;

    const area = n.slice(0, 2);
    const sub = n.slice(2);

    // Area code can't start with 0
    if (area.startsWith('0')) return false;

    // Mobile: 9 digits starting with 9
    if (sub.length === 9) return sub.startsWith('9');

    // Landline: 8 digits starting with 2-5
    return /^[2-5]\d{7}$/.test(sub);
}

export function normalizeToE164(raw: string): string {
    if (!raw || typeof raw !== 'string') throw new Error('Invalid phone number');

    const input = raw.trim();
    const hasPlus = input.startsWith('+');
    const digits = input.replace(/\D+/g, '');

    // Already in international format with '+'
    if (hasPlus) {
        if (digits.length < 8 || digits.length > 15) throw new Error('Invalid phone number');
        return '+' + digits;
    }

    let d = digits;

    // Handle international prefix '00'
    if (d.startsWith('00')) {
        d = d.slice(2);
        if (d.length < 8 || d.length > 15) throw new Error('Invalid phone number');
        return '+' + d;
    }

    // Strip national trunk prefix '0's
    d = d.replace(/^0+/, '');

    // If includes Brazil country code already
    if (d.startsWith('55')) {
        const national = d.slice(2);
        if (!isValidBRNational(national)) throw new Error('Invalid phone number');
        return '+' + d;
    }

    // Assume BR by default
    if (!isValidBRNational(d)) throw new Error('Invalid phone number');
    return '+55' + d;
}

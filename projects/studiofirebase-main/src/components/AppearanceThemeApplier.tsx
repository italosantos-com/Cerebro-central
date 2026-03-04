"use client";

import { useEffect } from 'react';
import { useProfileConfig } from '@/hooks/use-profile-config';
import type { ProfileSettings } from '@/app/admin/settings/actions';

const DEFAULT_APPEARANCE: Required<NonNullable<ProfileSettings['appearanceSettings']>> = {
    textColor: '#ffffff',
    numberColor: '#ffffff',
    buttonColor: '#0a84ff',
    buttonTextColor: '#ffffff',
    lineColor: '#333333',
    neonGlowColor: '#0a84ff',
    containerColor: '#1a1a1a',
    backgroundColor: '#121212',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSizePx: 16,
    iconColor: '#ffffff',
    userSidebarIconColor: '#ffffff',
    adminSidebarIconColor: '#ffffff',
    secretChatColor: '#0a84ff',
    whatsappBubbleColor: '#25d366',
    iosHeaderBg: '#e5e5ea',
    iosHeaderBorder: '#c7c7cc',
};

function normalizeHex(value: string | undefined, fallback: string): string {
    if (!value) return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((ch) => ch + ch).join('')
        : normalized;

    if (full.length !== 6) return null;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);

    if ([r, g, b].some((value) => Number.isNaN(value))) return null;

    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case rNorm:
                h = ((gNorm - bNorm) / delta) % 6;
                break;
            case gNorm:
                h = (bNorm - rNorm) / delta + 2;
                break;
            case bNorm:
                h = (rNorm - gNorm) / delta + 4;
                break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }

    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function hexToHslString(hex: string, fallback: string): string {
    const hsl = hexToHsl(hex);
    if (!hsl) return fallback;
    return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((ch) => ch + ch).join('')
        : normalized;

    if (full.length !== 6) return null;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);

    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    return { r, g, b };
}

function getReadableForeground(hex: string, light = '#ffffff', dark = '#000000'): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return light;
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.6 ? dark : light;
}

export default function AppearanceThemeApplier() {
    const { settings } = useProfileConfig();

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const appearance = {
            ...DEFAULT_APPEARANCE,
            ...(settings?.appearanceSettings || {}),
        };

        const textColor = normalizeHex(appearance.textColor, DEFAULT_APPEARANCE.textColor);
        const numberColor = normalizeHex(appearance.numberColor, DEFAULT_APPEARANCE.numberColor);
        const buttonColor = normalizeHex(appearance.buttonColor, DEFAULT_APPEARANCE.buttonColor);
        const buttonTextColor = normalizeHex(appearance.buttonTextColor, DEFAULT_APPEARANCE.buttonTextColor);
        const lineColor = normalizeHex(appearance.lineColor, DEFAULT_APPEARANCE.lineColor);
        const neonGlowColor = normalizeHex(appearance.neonGlowColor, DEFAULT_APPEARANCE.neonGlowColor);
        const containerColor = normalizeHex(appearance.containerColor, DEFAULT_APPEARANCE.containerColor);
        const backgroundColor = normalizeHex(appearance.backgroundColor, DEFAULT_APPEARANCE.backgroundColor);
        const iconColor = normalizeHex(appearance.iconColor, DEFAULT_APPEARANCE.iconColor);
        const userSidebarIconColor = normalizeHex(appearance.userSidebarIconColor, DEFAULT_APPEARANCE.userSidebarIconColor);
        const adminSidebarIconColor = normalizeHex(appearance.adminSidebarIconColor, DEFAULT_APPEARANCE.adminSidebarIconColor);
        const secretChatColor = normalizeHex(appearance.secretChatColor, DEFAULT_APPEARANCE.secretChatColor);
        const whatsappBubbleColor = normalizeHex(appearance.whatsappBubbleColor, DEFAULT_APPEARANCE.whatsappBubbleColor);
        const iosHeaderBg = normalizeHex(appearance.iosHeaderBg, DEFAULT_APPEARANCE.iosHeaderBg);
        const iosHeaderBorder = normalizeHex(appearance.iosHeaderBorder, DEFAULT_APPEARANCE.iosHeaderBorder);

        const fontFamily = appearance.fontFamily || DEFAULT_APPEARANCE.fontFamily;
        const fontSizePx = Number.isFinite(appearance.fontSizePx) ? appearance.fontSizePx : DEFAULT_APPEARANCE.fontSizePx;

        const root = document.documentElement;

        // Detect iOS theme only when the iOS template palette is effectively selected
        const normalizedBackground = backgroundColor.toLowerCase();
        const normalizedContainer = containerColor.toLowerCase();
        const normalizedButton = buttonColor.toLowerCase();
        const normalizedText = textColor.toLowerCase();
        const normalizedLine = lineColor.toLowerCase();
        const normalizedIcon = iconColor.toLowerCase();
        const normalizedNumber = numberColor.toLowerCase();
        const isIOSTheme =
            normalizedBackground === '#ffffff' &&
            normalizedContainer === '#f2f2f7' &&
            normalizedText === '#000000' &&
            normalizedLine === '#d1d1d6' &&
            ['#007aff', '#0a84ff'].includes(normalizedButton) &&
            ['#007aff', '#0a84ff'].includes(normalizedIcon) &&
            ['#007aff', '#0a84ff'].includes(normalizedNumber);

        root.style.setProperty('--ios-header-bg', iosHeaderBg);
        root.style.setProperty('--ios-header-border', iosHeaderBorder);

        // Set data attribute to disable neon effects when iOS theme is active
        if (isIOSTheme) {
            root.setAttribute('data-theme', 'ios');
        } else {
            root.removeAttribute('data-theme');
        }

        root.style.setProperty('--app-text-color', textColor);
        root.style.setProperty('--app-number-color', numberColor);
        root.style.setProperty('--app-button-color', buttonColor);
        root.style.setProperty('--app-button-text-color', buttonTextColor);
        root.style.setProperty('--app-line-color', lineColor);
        root.style.setProperty('--app-neon-color', neonGlowColor);
        root.style.setProperty('--app-container-color', containerColor);
        root.style.setProperty('--app-background-color', backgroundColor);
        root.style.setProperty('--app-font-family', fontFamily);
        root.style.setProperty('--app-font-size', `${fontSizePx}px`);
        root.style.setProperty('--app-icon-color', iconColor);
        root.style.setProperty('--app-user-sidebar-icon-color', userSidebarIconColor);
        root.style.setProperty('--app-admin-sidebar-icon-color', adminSidebarIconColor);
        root.style.setProperty('--app-secret-chat-color', secretChatColor);
        root.style.setProperty('--app-secret-chat-foreground', getReadableForeground(secretChatColor));
        root.style.setProperty('--app-whatsapp-bubble-color', whatsappBubbleColor);
        root.style.setProperty('--app-whatsapp-bubble-foreground', getReadableForeground(whatsappBubbleColor));
        root.style.setProperty('--font-sans', fontFamily);

        root.style.setProperty('--background', hexToHslString(backgroundColor, '0 0% 0%'));
        root.style.setProperty('--foreground', hexToHslString(textColor, '0 0% 100%'));
        root.style.setProperty('--card', hexToHslString(containerColor, '0 0% 8%'));
        root.style.setProperty('--card-foreground', hexToHslString(textColor, '0 0% 100%'));
        root.style.setProperty('--popover', hexToHslString(containerColor, '0 0% 12%'));
        root.style.setProperty('--popover-foreground', hexToHslString(textColor, '0 0% 100%'));
        root.style.setProperty('--primary', hexToHslString(buttonColor, '0 0% 100%'));
        root.style.setProperty('--primary-foreground', hexToHslString(buttonTextColor, '0 0% 0%'));
        root.style.setProperty('--border', hexToHslString(lineColor, '0 0% 30%'));
        root.style.setProperty('--input', hexToHslString(lineColor, '0 0% 20%'));
        root.style.setProperty('--ring', hexToHslString(neonGlowColor, '0 0% 80%'));
    }, [settings]);

    return null;
}

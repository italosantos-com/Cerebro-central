/**
 * Utility functions for IP address extraction and handling
 */

import { NextRequest } from 'next/server';
import { IncomingMessage } from 'http';
import * as net from 'net';

/**
 * Validates if a string is a valid IPv4 or IPv6 address
 * Uses Node.js net module for reliable validation
 * 
 * @param ip - String to validate
 * @returns true if valid IP address, false otherwise
 */
export function isValidIP(ip: string): boolean {
  // Use net.isIP for reliable validation
  // Returns 0 for invalid, 4 for IPv4, 6 for IPv6
  return net.isIP(ip) !== 0;
}

/**
 * Extracts the client IP address from a NextRequest
 * Checks various headers commonly used by proxies/load balancers
 * Validates IP addresses before returning
 * 
 * @param request - NextRequest object
 * @returns The client IP address or null if not found
 */
export function getClientIP(request: NextRequest): string | null {
  // Check Cloudflare header first (most reliable when using Cloudflare)
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP;
  }

  // Check X-Forwarded-For (common proxy header)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, the first one is the client
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Validate the first IP to prevent injection attacks
    if (ips.length > 0 && ips[0] && isValidIP(ips[0])) {
      return ips[0];
    }
  }

  // Check X-Real-IP (common alternative)
  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Check True-Client-IP (Akamai and some other CDNs)
  const trueClientIP = request.headers.get('true-client-ip');
  if (trueClientIP && isValidIP(trueClientIP)) {
    return trueClientIP;
  }

  // Fallback to X-Client-IP
  const clientIP = request.headers.get('x-client-ip');
  if (clientIP && isValidIP(clientIP)) {
    return clientIP;
  }

  // No valid IP found
  return null;
}

/**
 * Extracts the client IP address from an IncomingMessage (for API routes)
 * Validates IP addresses before returning
 * 
 * @param req - IncomingMessage object
 * @returns The client IP address or null if not found
 */
export function getClientIPFromRequest(req: IncomingMessage): string | null {
  const headers = req.headers;

  // Check Cloudflare header first
  const cfConnectingIP = headers['cf-connecting-ip'];
  if (cfConnectingIP) {
    const ip = Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP;
    if (isValidIP(ip)) {
      return ip;
    }
  }

  // Check X-Forwarded-For
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ips = value.split(',').map(ip => ip.trim());
    // Validate the first IP to prevent injection attacks
    if (ips.length > 0 && ips[0] && isValidIP(ips[0])) {
      return ips[0];
    }
  }

  // Check X-Real-IP
  const realIP = headers['x-real-ip'];
  if (realIP) {
    const ip = Array.isArray(realIP) ? realIP[0] : realIP;
    if (isValidIP(ip)) {
      return ip;
    }
  }

  // Check True-Client-IP
  const trueClientIP = headers['true-client-ip'];
  if (trueClientIP) {
    const ip = Array.isArray(trueClientIP) ? trueClientIP[0] : trueClientIP;
    if (isValidIP(ip)) {
      return ip;
    }
  }

  // Fallback to socket remote address
  const remoteAddress = req.socket?.remoteAddress;
  if (remoteAddress) {
    // Handle IPv6 localhost
    if (remoteAddress === '::1') {
      return '127.0.0.1';
    }
    // Handle IPv4-mapped IPv6 addresses
    if (remoteAddress.startsWith('::ffff:')) {
      return remoteAddress.substring(7);
    }
    if (isValidIP(remoteAddress)) {
      return remoteAddress;
    }
  }

  return null;
}

/**
 * Checks if an IP address is a private/internal IP
 * 
 * @param ip - IP address to check
 * @returns true if private IP, false otherwise
 */
export function isPrivateIP(ip: string): boolean {
  // Normalize IP to lowercase for IPv6 comparison
  const normalizedIP = ip.toLowerCase();
  
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,                         // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                   // 192.168.0.0/16
    /^127\./,                        // 127.0.0.0/8 (localhost)
    /^169\.254\./,                   // 169.254.0.0/16 (link-local)
  ];

  for (const range of privateRanges) {
    if (range.test(ip)) {
      return true;
    }
  }

  // IPv6 private addresses (ULA - Unique Local Address)
  // ::1 is localhost, fe80: is link-local, fc00:/fd00: are ULA prefixes
  // Using lowercase comparison to handle mixed-case hex digits
  if (normalizedIP === '::1' || 
      normalizedIP.startsWith('fe80:') || 
      normalizedIP.startsWith('fc00:') || 
      normalizedIP.startsWith('fd00:')) {
    return true;
  }

  return false;
}

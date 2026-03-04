import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Otimização para contêineres
  outputFileTracingRoot: __dirname,
  typescript: {
    // Evita falhas de build por consumo de memoria no typecheck.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Mitiga falhas TLS ao baixar recursos (ex: fonts) em ambientes com store custom.
    turbopackUseSystemTlsCerts: true,
    serverActions: {
      allowedOrigins: ['https://*.app.github.dev', 'https://*.githubpreview.dev', 'http://localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' }, // Pattern para FB
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'mercadopago.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
  transpilePackages: ['undici', '@opentelemetry/sdk-node', 'require-in-the-middle'],
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@opentelemetry\/instrumentation|require-in-the-middle/,
        message: /Critical dependency:/,
      },
    ];
    return config;
  },
};

export default nextConfig;
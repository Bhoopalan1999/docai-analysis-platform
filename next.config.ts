import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Set the workspace root to silence the multiple lockfiles warning
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { isServer, webpack }) => {
    // Create a stub module path for canvas
    const canvasStubPath = path.resolve(process.cwd(), 'lib/canvas-stub.js');

    // Apply canvas stub for both client and server builds
    // This prevents pdfjs-dist from trying to require 'canvas' during build
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^canvas$/, canvasStubPath));

    // Use alias to redirect canvas to stub
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: canvasStubPath,
    };

    // Set fallback for Node.js modules (mainly for client-side)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  // Add empty turbopack config to silence warning when webpack is explicitly used
  turbopack: {},
};

export default nextConfig;

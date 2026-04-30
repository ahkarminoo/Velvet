/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      },
      {
        source: "/:path*",
        headers: [
          { 
            key: "Content-Security-Policy", 
            value: "default-src 'self'; " +
                   "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.gstatic.com https://static.line-scdn.net https://d.line-scdn.net https://js.stripe.com; " +
                   "style-src 'self' 'unsafe-inline' https://*.googleapis.com; " +
                   "img-src 'self' data: https: blob:; " +
                   "font-src 'self' data: https://*.gstatic.com; " +
                   "connect-src 'self' https: wss: https://api.stripe.com https://*.stripe.com; " +
                   "frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://js.stripe.com https://*.stripe.com; " +
                   "child-src 'self' https://js.stripe.com https://*.stripe.com;"
          }
        ]
      }
    ]
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    JWT_SECRET: process.env.JWT_SECRET
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'as1.ftcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'as2.ftcdn.net',
        port: '',
        pathname: '/**',
      },
    ]
  },
  // Disable React StrictMode in development for better 3D performance
  reactStrictMode: process.env.NODE_ENV === 'production',
  // Webpack optimizations for Three.js
  webpack: (config, { dev, isServer }) => {
    if (!isServer && !dev) {
      // Production optimizations
      config.optimization.splitChunks.cacheGroups.three = {
        test: /[\\/]node_modules[\\/]three[\\/]/,
        name: 'three',
        chunks: 'all',
        priority: 10,
      };
    }
    
    return config;
  },
};

export default nextConfig;
  

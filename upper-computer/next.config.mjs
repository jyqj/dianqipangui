/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 使用自定义 server，不需要 Next.js 自带的 server
  // webpack 配置排除 server-only 模块
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;

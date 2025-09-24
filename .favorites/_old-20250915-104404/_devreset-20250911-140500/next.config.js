/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // 파일 기반 퍼시스턴트 캐시 끄기 → pack.gz 관련 오류 방지
      config.cache = { type: "memory" };
    }
    return config;
  },
};
module.exports = nextConfig;

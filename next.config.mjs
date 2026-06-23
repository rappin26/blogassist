/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel 등 서버리스 배포 시 data/persona.json 을 함수 번들에 포함시킨다.
  experimental: {
    outputFileTracingIncludes: {
      "/api/rewrite": ["./data/**"],
    },
  },
};

export default nextConfig;

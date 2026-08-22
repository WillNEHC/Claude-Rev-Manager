/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server-only packages that must not be bundled for the browser.
  serverExternalPackages: ["pino", "@anthropic-ai/sdk"],
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remotion's renderer/bundler are native, server-only packages. Keep them out
  // of the bundling step so their native binaries load correctly at runtime.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
};

export default nextConfig;

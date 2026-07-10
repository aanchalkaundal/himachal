/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remotion's renderer/bundler are native, server-only packages. Keep them out
  // of the bundling step so their native binaries load correctly at runtime.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
  // Vercel (and most serverless hosts) cap a function at 250 MB. Remotion's
  // renderer + bundler (esbuild/webpack/compositor binaries) blow past that, so
  // the /api/render function fails to deploy. Exclude those heavy packages from
  // the function trace so the deploy succeeds. NOTE: this means server-side
  // rendering will not run on Vercel serverless (it can't there anyway — no
  // persistent headless browser / ephemeral FS / short timeouts). The editor and
  // live preview work fully; run actual MP4 rendering on a proper server, a
  // long-running container, or Remotion Lambda.
  outputFileTracingExcludes: {
    "/api/render/**": [
      "node_modules/@remotion/**",
      "node_modules/remotion/**",
      "node_modules/esbuild/**",
      "node_modules/@esbuild/**",
      "node_modules/webpack/**",
      "node_modules/@swc/**",
    ],
  },
};

export default nextConfig;

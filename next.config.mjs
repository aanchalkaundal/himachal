// DESKTOP=1 builds for the local Electron app (rendering runs on the user's
// machine, so we KEEP the Remotion packages and emit a standalone server).
const isDesktop = process.env.DESKTOP === "1";
// VERCEL is set automatically on Vercel; only there do we strip the heavy
// Remotion packages to fit the 250 MB serverless function limit.
const isVercel = Boolean(process.env.VERCEL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remotion's renderer/bundler are native, server-only packages. Keep them out
  // of the bundling step so their native binaries load correctly at runtime.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
  // Standalone server output for the Electron desktop build.
  ...(isDesktop ? { output: "standalone" } : {}),
  // On Vercel serverless only, strip Remotion from the render function trace so
  // the deploy fits under 250 MB (rendering can't run on Vercel anyway).
  ...(isVercel && !isDesktop
    ? {
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
      }
    : {}),
};

export default nextConfig;

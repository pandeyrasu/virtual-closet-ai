/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // @xenova/transformers is browser-only in this app; stub out its
    // optional Node-side dependencies so webpack doesn't try to bundle them.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;

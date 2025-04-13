/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static exports for GitHub Pages
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Recommended for GitHub Pages

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;

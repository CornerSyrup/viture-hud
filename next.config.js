/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',    // Enable static exports for GitHub Pages
  images: {            // Enable for SSG
    unoptimized: true
  },
  trailingSlash: true, // Recommended for GitHub Pages
  basePath: process.env.GITHUB_PAGES === 'true' ? '/viture-hud' : '',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA(nextConfig);

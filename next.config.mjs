/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static exports for GitHub Pages
  images: {
    unoptimized: true, // Required for static export
  },
  // GitHub Pages uses a subdirectory when the repo name isn't username.github.io
  // If your repo is named differently, uncomment and adjust the line below:
  // basePath: '/your-repo-name',
  trailingSlash: true, // Recommended for GitHub Pages
};

export default nextConfig;

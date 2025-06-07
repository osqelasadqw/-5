/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Windows-ზე ESM-ის პრობლემას აგვარებს, ვაუქმებთ experimental ფლაგს
};

module.exports = nextConfig; 
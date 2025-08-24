import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://192.168.1.132:3000',
    'http://192.168.1.132',
  ]// Remplacez par l'IP de votre machine locale
};

export default nextConfig;

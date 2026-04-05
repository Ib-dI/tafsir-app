import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
    ],
  },
};

export default nextConfig;

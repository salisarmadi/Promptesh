import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lloigqtejbrndznjnlwr.supabase.co",
        pathname: "/storage/v1/object/public/Gallery/**",
      },
    ],
  },
};

export default nextConfig;
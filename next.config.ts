import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // دسترسی از دستگاه‌های همان شبکه در حالت توسعه (برای HMR و assetهای Next).
  // در صورت تغییر IP سیستم، این مقدار را با IP جدید جایگزین کن.
  allowedDevOrigins: ["192.168.1.3"],
  experimental: {
    // آپلود تصویرِ کاربر حداکثر ۴ مگابایت است؛ سربار فرم هم در نظر گرفته شده.
    serverActions: { bodySizeLimit: "5mb" },
  },
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

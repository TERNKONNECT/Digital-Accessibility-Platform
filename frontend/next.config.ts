import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/pro-solve/image/upload/**",
      },
    ],
  },
};

export default nextConfig;

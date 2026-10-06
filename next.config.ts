import type { NextConfig } from "next";
const url = new URL(process.env.DIRECTUS_URL || "https://cms.pat1.online");
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: url.protocol === "https:" ? "https" : "http",
        hostname: url.hostname,
        port: url.port,
        pathname: `${url.pathname.replace(/\/$/, "")}/assets/**`,
      },
    ],
  },
};
export default config;

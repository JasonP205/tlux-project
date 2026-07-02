import os from "os";
import type { NextConfig } from "next";

// Cho phép điện thoại cùng mạng LAN truy cập dev server (HMR websocket, /_next/*)
const lanIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: lanIps,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs roda só no servidor (rota de exportação)
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;

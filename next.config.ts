import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs roda só no servidor (rota de exportação)
  serverExternalPackages: ["exceljs"],
  // fotos e planilhas enviadas na importação de itens
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;

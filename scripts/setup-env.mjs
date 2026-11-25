// Cria o .env a partir do .env.example na primeira instalação (não sobrescreve).
import { copyFileSync, existsSync } from "node:fs";

if (!existsSync(".env") && existsSync(".env.example")) {
  copyFileSync(".env.example", ".env");
  console.log("[setup] .env criado a partir de .env.example");
}

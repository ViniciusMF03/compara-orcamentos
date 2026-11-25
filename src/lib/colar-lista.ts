/**
 * "Colar lista": transforma texto livre (uma linha por item) em itens estruturados.
 * Ex.: "5 quilos de arame 10" → { quantidade: 5, unidade: "kg", descricao: "Arame 10" }
 */
import { parseNumeroBR } from "./formato";

export const UNIDADES = ["un", "pç", "kg", "m", "m²", "rl", "sc", "cx", "pct", "l", "bd"];

/** palavra (minúscula, sem ponto final) → unidade */
const MAPA_UNIDADES: Record<string, string> = {};
function mapear(unidade: string, palavras: string[]) {
  for (const p of palavras) MAPA_UNIDADES[p] = unidade;
}
mapear("un", ["un", "und", "unid", "unidade", "unidades", "u"]);
mapear("pç", ["pç", "pc", "pcs", "pçs", "peça", "peças", "peca", "pecas"]);
mapear("kg", ["kg", "kgs", "quilo", "quilos", "kilo", "kilos", "quilograma", "quilogramas"]);
mapear("m", ["m", "mt", "mts", "metro", "metros"]);
mapear("m²", ["m²", "m2", "metro²", "metros²"]);
mapear("rl", ["rl", "rolo", "rolos"]);
mapear("sc", ["sc", "saco", "sacos"]);
mapear("cx", ["cx", "caixa", "caixas"]);
mapear("pct", ["pct", "pcts", "pacote", "pacotes"]);
mapear("l", ["l", "lt", "lts", "litro", "litros"]);
mapear("bd", ["bd", "balde", "baldes"]);

export interface ItemColado {
  quantidade: number;
  unidade: string;
  descricao: string;
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseLinha(linhaOriginal: string): ItemColado | null {
  // remove marcadores de lista ("-", "•", "1)", "*")
  const linha = linhaOriginal.replace(/^\s*(?:[-•*]+|\d+[).]\s)\s*/, "").trim();
  if (!linha) return null;

  let quantidade = 1;
  let resto = linha;

  // quantidade no início: "11", "1,5", "2.5", "10x", "10 x"
  const mQtd = linha.match(/^(\d+(?:[.,]\d+)?)\s*(?:x\s+|x(?=\D)|\s+|(?=(?!x\d)[a-zA-ZÀ-ÿ²]))/i);
  if (mQtd) {
    const n = parseNumeroBR(mQtd[1]);
    if (n !== null && n > 0) {
      quantidade = n;
      resto = linha.slice(mQtd[0].length).trim();
    }
  }

  let unidade = "un";
  // "metros quadrados" antes da regra geral
  const mM2 = resto.match(/^metros?\s+quadrados?\b\.?\s*/i);
  if (mM2) {
    unidade = "m²";
    resto = resto.slice(mM2[0].length);
  } else {
    const mUn = resto.match(/^([a-zA-ZÀ-ÿ]+[²2]?)\.?(?=\s|$)\s*/);
    if (mUn) {
      const u = MAPA_UNIDADES[mUn[1].toLowerCase()];
      if (u) {
        unidade = u;
        resto = resto.slice(mUn[0].length);
      }
    }
  }

  // "5 quilos de arame" → "arame"
  resto = resto.replace(/^(?:de|do|da|dos|das)\s+/i, "").trim();
  if (!resto) return null;

  return { quantidade, unidade, descricao: capitalizar(resto) };
}

export function parseListaColada(texto: string): ItemColado[] {
  return texto
    .split(/\r?\n/)
    .map(parseLinha)
    .filter((i): i is ItemColado => i !== null);
}

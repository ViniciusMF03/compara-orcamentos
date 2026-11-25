/** Formatação e leitura de valores no padrão pt-BR. */

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/** R$ 1.234,56 (com espaço normal, não o espaço especial do Intl) */
export function formatarMoeda(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return moeda.format(v + 0).replace(/ /g, " "); // + 0 evita "-R$ 0,00"
}

const moedaUnitaria = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });

/** Preço por unidade, com até 4 casas: R$ 0,1192 */
export function formatarMoedaUnitaria(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return moedaUnitaria.format(v).replace(/ /g, " ");
}

export function formatarNumero(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return numero.format(v);
}

/** dd/mm/aaaa. Datas são guardadas ao meio-dia UTC, então formatamos em UTC. */
export function formatarData(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return data.format(typeof d === "string" ? new Date(d) : d);
}

/** Date → "aaaa-mm-dd" (valor para <input type="date">) */
export function paraInputData(d: Date | string | null | undefined): string {
  if (!d) return "";
  return (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

/** "aaaa-mm-dd" → Date ao meio-dia UTC (evita trocar o dia por fuso horário). */
export function deInputData(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T12:00:00Z`);
}

export function hojeInputData(): string {
  const h = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

/**
 * Lê número digitado em pt-BR: "1.234,56", "45,32", "0.24", "R$ 85". Retorna null se inválido.
 * Regra: havendo vírgula, ela é o decimal e os pontos são milhar; sem vírgula, o ponto é decimal.
 */
export function parseNumeroBR(s: string | number | null | undefined): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (!s) return null;
  let t = s.replace(/R\$|\s/g, "");
  if (t === "") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d*\.?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Número → texto para campo de formulário ("45,32"). */
export function numeroParaCampo(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(".", ",");
}

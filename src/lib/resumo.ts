/** Texto "o que comprar em cada fornecedor" para colar no WhatsApp. */
import type { Analise } from "./calculos";
import { formatarMoeda, formatarNumero } from "./formato";

export function resumoWhatsApp(nomeLista: string, analise: Analise): string {
  const comb = analise.melhorCombinacao;
  if (!comb) return `*${nomeLista}*\nAinda não há orçamentos que cubram todos os itens.`;

  const linhas: string[] = [`*${nomeLista}* — melhor forma de comprar`, ""];
  for (const c of comb.compras) {
    linhas.push(`*${c.fornecedorNome}*`);
    for (const i of c.itens) {
      const aviso = i.cotado.conferencia === "DIVERGENTE" ? " ⚠" : i.cotado.conferencia === "CONFIRMAR" ? " (?)" : "";
      linhas.push(`• ${formatarNumero(i.item.quantidade)} ${i.item.unidade} ${i.item.descricao} — ${formatarMoeda(i.total)}${aviso}`);
    }
    if (c.desconto) linhas.push(`Desconto: −${formatarMoeda(c.desconto)}`);
    linhas.push(`Frete: ${formatarMoeda(c.frete)}`);
    linhas.push(`Total ${c.fornecedorNome}: ${formatarMoeda(c.total)}`, "");
  }
  linhas.push(`*Total geral: ${formatarMoeda(comb.custo)}*`);
  if (analise.melhorUnico && analise.economia !== null && analise.economia > 0) {
    linhas.push(`Economia de ${formatarMoeda(analise.economia)} em relação a comprar tudo na ${analise.melhorUnico.fornecedorNome}.`);
  }
  return linhas.join("\n");
}

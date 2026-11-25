import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { carregarLista } from "@/lib/dados";
import { analisar, LIMITE_FORCA_BRUTA, type Analise, type CelulaComparativo } from "@/lib/calculos";
import { formatarMoeda, formatarMoedaUnitaria, formatarNumero } from "@/lib/formato";
import { resumoWhatsApp } from "@/lib/resumo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ListaAbas } from "@/components/lista-abas";
import { AcoesComparativo } from "@/components/acoes-comparativo";

export const dynamic = "force-dynamic";

type Total = Analise["totais"][number];

export default async function Comparativo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lista = await carregarLista(id);
  if (!lista) notFound();

  const abas = <ListaAbas listaId={lista.id} nome={lista.nome} obra={lista.obraNome} ativa="comparativo" />;

  if (lista.itens.length === 0 || lista.orcamentos.length === 0) {
    const semItens = lista.itens.length === 0;
    return (
      <div>
        {abas}
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {semItens ? "A lista ainda não tem itens." : "Lance pelo menos um orçamento para ver o comparativo."}
          </p>
          <Button asChild className="mt-4">
            <Link href={semItens ? `/listas/${lista.id}` : `/orcamentos/novo?lista=${lista.id}`}>
              <Plus /> {semItens ? "Cadastrar itens" : "Lançar orçamento"}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const orcs = lista.orcamentos;
  const a = analisar(lista.itens, orcs);
  const comb = a.melhorCombinacao;
  const totais = new Map(a.totais.map((t) => [t.orcamentoId, t]));

  return (
    <div className="space-y-5">
      {abas}

      <AcoesComparativo listaId={lista.id} resumo={resumoWhatsApp(lista.nome, a)} />

      {/* Resumo */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Melhor orçamento único</p>
          {a.melhorUnico ? (
            <>
              <p className="text-lg font-semibold">{a.melhorUnico.fornecedorNome}</p>
              <p className="text-2xl font-bold tabular-nums">{formatarMoeda(a.melhorUnico.total)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm">Nenhum orçamento cotou todos os itens.</p>
          )}
        </Card>
        <Card className="border-emerald-300 bg-emerald-50/60 p-4">
          <p className="text-sm text-emerald-900">Melhor forma de comprar</p>
          {comb ? (
            <>
              <p className="text-lg font-semibold">
                {comb.compras.length === 1 ? `Só ${comb.compras[0].fornecedorNome}` : comb.compras.map((c) => c.fornecedorNome).join(" + ")}
              </p>
              <p className="text-2xl font-bold tabular-nums text-emerald-800">{formatarMoeda(comb.custo)}</p>
              {comb.heuristica && (
                <p className="mt-1 text-xs text-amber-800">
                  Mais de {LIMITE_FORCA_BRUTA} orçamentos: usada uma estimativa rápida, pode não ser a combinação ótima.
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm">Nenhuma combinação de orçamentos cobre todos os itens.</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Economia</p>
          {a.economia !== null ? (
            <>
              <p className="text-2xl font-bold tabular-nums">{formatarMoeda(a.economia)}</p>
              <p className="text-sm text-muted-foreground">
                {a.economia > 0 ? "dividindo a compra, em relação ao melhor orçamento único" : "dividir a compra não compensa"}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
          {a.todosMaisBaratos && a.todosMaisBaratos.compras.length > 1 && comb && a.todosMaisBaratos.custo > comb.custo && (
            <p className="mt-2 text-xs text-muted-foreground">
              Comprar o mais barato de cada item em todos daria {formatarMoeda(a.todosMaisBaratos.custo)} (com{" "}
              {formatarMoeda(a.todosMaisBaratos.compras.reduce((s, c) => s + c.frete, 0))} de frete).
            </p>
          )}
        </Card>
      </section>

      {/* O que comprar em cada fornecedor */}
      {comb && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">O que comprar em cada fornecedor</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {comb.compras.map((c) => (
              <Card key={c.orcamentoId} className="p-4">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{c.fornecedorNome}</p>
                  <p className="font-semibold tabular-nums">{formatarMoeda(c.total)}</p>
                </div>
                <ul className="space-y-0.5 text-sm">
                  {c.itens.map((i) => (
                    <li key={i.item.id} className="flex justify-between gap-2">
                      <span>
                        {formatarNumero(i.item.quantidade)} {i.item.unidade} {i.item.descricao}
                        {i.cotado.conferencia === "DIVERGENTE" && <span title="Divergente"> ⚠</span>}
                        {i.cotado.conferencia === "CONFIRMAR" && <span title="Confirmar"> ?</span>}
                      </span>
                      <span className="tabular-nums">{formatarMoeda(i.total)}</span>
                    </li>
                  ))}
                  {c.desconto > 0 && (
                    <li className="flex justify-between border-t pt-1 text-muted-foreground">
                      <span>Desconto</span>
                      <span className="tabular-nums">−{formatarMoeda(c.desconto)}</span>
                    </li>
                  )}
                  <li className={cn("flex justify-between text-muted-foreground", !c.desconto && "border-t pt-1")}>
                    <span>Frete</span>
                    <span className="tabular-nums">{formatarMoeda(c.frete)}</span>
                  </li>
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      {a.incompletos.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/60 p-4 text-sm">
          <p className="mb-1 font-medium">Orçamentos que não cotaram tudo</p>
          <ul className="space-y-1">
            {a.incompletos.map((x) => (
              <li key={x.orcamentoId}>
                <strong>{x.fornecedorNome}</strong>: faltam {x.faltando.map((i) => i.descricao).join(", ")}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Tabela (computador e impressão) */}
      <section className="hidden md:block print:block">
        <h2 className="mb-2 text-lg font-semibold">Comparativo por item</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Qtd</th>
                {orcs.map((o) => (
                  <th key={o.id} className="px-3 py-2 text-right">
                    <Link href={`/orcamentos/${o.id}`} className="hover:underline">
                      {o.fornecedorNome}
                    </Link>
                  </th>
                ))}
                {orcs.length > 1 && <th className="px-3 py-2 text-right text-muted-foreground">Diferença</th>}
              </tr>
            </thead>
            <tbody>
              {a.porItem.map((l) => (
                <tr key={l.item.id} className="border-t">
                  <td className="px-3 py-2">{l.item.descricao}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatarNumero(l.item.quantidade)} {l.item.unidade}
                  </td>
                  {l.celulas.map((c) => (
                    <td key={c.orcamentoId} className={cn("px-3 py-2 text-right align-top", c.maisBarato && "bg-emerald-100/80")}>
                      <Celula c={c} unidadePedida={l.item.unidade} />
                    </td>
                  ))}
                  {orcs.length > 1 && (
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {l.diferenca === null ? "—" : formatarMoeda(l.diferenca)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 tabular-nums">
              {(
                [
                  ["Subtotal", (t: Total) => t.totalItens],
                  ["Desconto", (t: Total) => -t.desconto],
                  ["Frete", (t: Total) => t.frete],
                ] as const
              ).map(([rotulo, f]) => (
                <tr key={rotulo} className="text-muted-foreground">
                  <td className="px-3 py-1" colSpan={2}>
                    {rotulo}
                  </td>
                  {orcs.map((o) => (
                    <td key={o.id} className="px-3 py-1 text-right">
                      {formatarMoeda(f(totais.get(o.id)!))}
                    </td>
                  ))}
                  {orcs.length > 1 && <td />}
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  Total geral
                </td>
                {orcs.map((o) => {
                  const t = totais.get(o.id)!;
                  const melhor = a.melhorUnico?.orcamentoId === o.id;
                  return (
                    <td key={o.id} className={cn("px-3 py-2 text-right", melhor && "bg-emerald-100/80 text-emerald-900")}>
                      {formatarMoeda(t.totalGeral)}
                      {!t.completo && <span className="block text-xs font-normal text-muted-foreground">incompleto</span>}
                    </td>
                  );
                })}
                {orcs.length > 1 && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Verde = mais barato do item · ⚠ divergente (entra no cálculo) · ? a confirmar · valores em cinza = não cotado
        </p>
      </section>

      {/* Cards (celular) */}
      <section className="space-y-2 md:hidden print:hidden">
        <h2 className="text-lg font-semibold">Comparativo por item</h2>
        {a.porItem.map((l) => {
          const ordenadas = [...l.celulas].sort((x, y) => (x.total ?? Infinity) - (y.total ?? Infinity));
          return (
            <Card key={l.item.id} className="p-3">
              <p className="font-medium">
                {l.item.descricao}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  · {formatarNumero(l.item.quantidade)} {l.item.unidade}
                </span>
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {ordenadas.map((c) => {
                  const o = orcs.find((x) => x.id === c.orcamentoId)!;
                  return (
                    <li key={c.orcamentoId} className={cn("flex items-start justify-between gap-2 rounded px-2 py-1", c.maisBarato && "bg-emerald-100/80")}>
                      <span>{o.fornecedorNome}</span>
                      <span className="text-right">
                        <Celula c={c} unidadePedida={l.item.unidade} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              {l.diferenca !== null && l.diferenca > 0 && (
                <p className="mt-1 text-right text-xs text-muted-foreground">diferença {formatarMoeda(l.diferenca)}</p>
              )}
            </Card>
          );
        })}
        <Card className="p-3">
          <p className="mb-1 font-medium">Totais</p>
          <ul className="space-y-1 text-sm">
            {[...a.totais]
              .sort((x, y) => x.totalGeral - y.totalGeral)
              .map((t) => (
                <li key={t.orcamentoId} className="flex justify-between gap-2">
                  <span>
                    {t.fornecedorNome}
                    {!t.completo && <span className="text-xs text-muted-foreground"> (incompleto)</span>}
                    <span className="block text-xs text-muted-foreground">
                      itens {formatarMoeda(t.totalItens)}
                      {t.desconto > 0 && ` − desc. ${formatarMoeda(t.desconto)}`} + frete {formatarMoeda(t.frete)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatarMoeda(t.totalGeral)}</span>
                </li>
              ))}
          </ul>
        </Card>
      </section>

      {lista.orcamentos.some((o) => o.itens.some((i) => i.conferencia !== "CONFERE")) && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
          <AlertTriangle className="size-3.5" /> Há itens a confirmar ou divergentes. Confira com o fornecedor antes de fechar a compra.
        </p>
      )}
      <div className="print:hidden">
        <Badge variant="outline">
          {orcs.length} {orcs.length === 1 ? "orçamento" : "orçamentos"} · {lista.itens.length} itens
        </Badge>
      </div>
    </div>
  );
}

function Celula({ c, unidadePedida }: { c: CelulaComparativo; unidadePedida: string }) {
  if (!c.cotado) return <span className="text-muted-foreground/70">não cotado</span>;
  const conf = c.cotado.conferencia;
  return (
    <span className="tabular-nums" title={c.cotado.observacao ?? c.cotado.descricaoCotada}>
      {conf === "DIVERGENTE" && <span className="text-red-600" title="Divergente">⚠ </span>}
      {conf === "CONFIRMAR" && <span className="text-amber-600" title="Confirmar">? </span>}
      <span className={cn(c.maisBarato && "font-semibold text-emerald-900")}>{formatarMoeda(c.total)}</span>
      <span className="block text-xs text-muted-foreground">
        {formatarNumero(c.cotado.quantidade)} {c.cotado.unidade} × {formatarMoedaUnitaria(c.cotado.valorUnitario)}
        {c.precoUnidadePedida !== null && c.cotado.unidade !== unidadePedida && (
          <>
            {" "}
            · {formatarMoedaUnitaria(c.precoUnidadePedida)}/{unidadePedida}
          </>
        )}
      </span>
    </span>
  );
}

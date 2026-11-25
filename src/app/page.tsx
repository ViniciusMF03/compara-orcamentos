import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { itemParaCalc, orcamentoParaView } from "@/lib/dados";
import { melhorCombinacao } from "@/lib/calculos";
import { formatarData, formatarMoeda } from "@/lib/formato";
import { ROTULO_STATUS, STATUS_LISTA, type StatusLista } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "ABERTA" } = await searchParams;
  const filtroStatus = (STATUS_LISTA as readonly string[]).includes(status) ? status : undefined;
  const busca = q.trim();

  const listas = await prisma.lista.findMany({
    where: {
      ...(filtroStatus ? { status: filtroStatus } : {}),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca } },
              { obra: { nome: { contains: busca } } },
              { itens: { some: { descricao: { contains: busca } } } },
            ],
          }
        : {}),
    },
    include: {
      obra: true,
      itens: true,
      orcamentos: { include: { fornecedor: true, itens: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const linhas = listas.map((l) => {
    const comb = melhorCombinacao(l.itens.map(itemParaCalc), l.orcamentos.map(orcamentoParaView));
    return {
      id: l.id,
      nome: l.nome,
      obra: l.obra?.nome,
      status: l.status as StatusLista,
      criadoEm: l.criadoEm,
      nItens: l.itens.length,
      nOrc: l.orcamentos.length,
      melhor: comb?.custo ?? null,
      fornecedores: comb?.compras.map((c) => c.fornecedorNome).join(" + "),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl">Listas de materiais</h1>
        <Button asChild>
          <Link href="/listas/nova">
            <Plus /> Nova lista
          </Link>
        </Button>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Buscar por lista, obra ou material…" className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Select name="status" defaultValue={filtroStatus ?? "TODAS"} className="sm:w-40">
            {STATUS_LISTA.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}s
              </option>
            ))}
            <option value="TODAS">Todas</option>
          </Select>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
      </form>

      {linhas.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {busca || filtroStatus !== "ABERTA"
              ? "Nenhuma lista encontrada com esses filtros."
              : "Nenhuma lista aberta ainda. Comece cadastrando o que você precisa comprar."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/listas/nova">
              <Plus /> Criar primeira lista
            </Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {linhas.map((l) => (
            <li key={l.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/listas/${l.id}/comparativo`} className="font-semibold hover:underline">
                      {l.nome}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {l.obra ?? "Sem obra"} · {formatarData(l.criadoEm)}
                    </p>
                  </div>
                  {l.status !== "ABERTA" && (
                    <Badge variant={l.status === "COMPRADA" ? "success" : "secondary"}>{ROTULO_STATUS[l.status]}</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {l.nItens} {l.nItens === 1 ? "item" : "itens"} · {l.nOrc} {l.nOrc === 1 ? "orçamento" : "orçamentos"}
                  </p>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Melhor total</p>
                    <p className="font-semibold tabular-nums">{l.melhor === null ? "—" : formatarMoeda(l.melhor)}</p>
                  </div>
                </div>
                {l.fornecedores && <p className="mt-1 truncate text-right text-xs text-muted-foreground">{l.fornecedores}</p>}
                <div className="mt-3 flex gap-2 border-t pt-3 text-sm">
                  <Link href={`/listas/${l.id}`} className="rounded px-2 py-1 hover:bg-accent">
                    Itens
                  </Link>
                  <Link href={`/listas/${l.id}/orcamentos`} className="rounded px-2 py-1 hover:bg-accent">
                    Orçamentos
                  </Link>
                  <Link href={`/listas/${l.id}/comparativo`} className="ml-auto rounded px-2 py-1 font-medium text-primary hover:bg-accent">
                    Comparativo →
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

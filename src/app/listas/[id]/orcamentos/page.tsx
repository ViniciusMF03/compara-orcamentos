import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Plus } from "lucide-react";
import { carregarLista } from "@/lib/dados";
import { itensFaltando, statusValidade, totalGeral, totalItens } from "@/lib/calculos";
import { formatarData, formatarMoeda } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ListaAbas } from "@/components/lista-abas";

export const dynamic = "force-dynamic";

export default async function OrcamentosDaLista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lista = await carregarLista(id);
  if (!lista) notFound();
  const semItens = lista.itens.length === 0;

  return (
    <div>
      <ListaAbas listaId={lista.id} nome={lista.nome} obra={lista.obraNome} ativa="orcamentos" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {lista.orcamentos.length} {lista.orcamentos.length === 1 ? "orçamento" : "orçamentos"} para {lista.itens.length}{" "}
          {lista.itens.length === 1 ? "item" : "itens"}
        </p>
        {!semItens && (
          <Button asChild>
            <Link href={`/orcamentos/novo?lista=${lista.id}`}>
              <Plus /> Novo orçamento
            </Link>
          </Button>
        )}
      </div>

      {semItens ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Cadastre os itens da lista antes de lançar orçamentos.</p>
          <Button asChild className="mt-4">
            <Link href={`/listas/${lista.id}`}>Cadastrar itens</Link>
          </Button>
        </Card>
      ) : lista.orcamentos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum orçamento lançado ainda.</p>
          <Button asChild className="mt-4">
            <Link href={`/orcamentos/novo?lista=${lista.id}`}>
              <Plus /> Lançar o primeiro orçamento
            </Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.orcamentos.map((o) => {
            const faltando = itensFaltando(o, lista.itens);
            const validade = statusValidade(o.validade);
            const divergentes = o.itens.filter((i) => i.conferencia === "DIVERGENTE").length;
            const confirmar = o.itens.filter((i) => i.conferencia === "CONFIRMAR").length;
            return (
              <li key={o.id}>
                <Link href={`/orcamentos/${o.id}`} className="block h-full">
                  <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:border-primary/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{o.fornecedorNome}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatarData(o.data)}
                          {o.numero && ` · nº ${o.numero}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold tabular-nums">{formatarMoeda(totalGeral(o))}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          itens {formatarMoeda(totalItens(o))} + frete {formatarMoeda(o.frete)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {validade === "VENCIDO" && (
                        <Badge variant="danger">
                          <CalendarClock className="size-3" /> Vencido em {formatarData(o.validade)}
                        </Badge>
                      )}
                      {validade === "VENCENDO" && (
                        <Badge variant="warning">
                          <CalendarClock className="size-3" /> Vence {formatarData(o.validade)}
                        </Badge>
                      )}
                      {validade === "OK" && <Badge variant="outline">Válido até {formatarData(o.validade)}</Badge>}
                      {faltando.length === 0 ? (
                        <Badge variant="success">Cotou tudo</Badge>
                      ) : (
                        <Badge variant="secondary">
                          Faltam {faltando.length} {faltando.length === 1 ? "item" : "itens"}
                        </Badge>
                      )}
                      {divergentes > 0 && <Badge variant="danger">⚠ {divergentes} divergente{divergentes > 1 && "s"}</Badge>}
                      {confirmar > 0 && <Badge variant="warning">? {confirmar} a confirmar</Badge>}
                    </div>
                    {faltando.length > 0 && (
                      <p className="text-xs text-muted-foreground">Não cotou: {faltando.map((i) => i.descricao).join(", ")}</p>
                    )}
                    {(o.condicaoPagamento || o.prazoEntrega) && (
                      <p className="mt-auto text-xs text-muted-foreground">
                        {[o.condicaoPagamento && `Pagamento: ${o.condicaoPagamento}`, o.prazoEntrega && `Entrega: ${o.prazoEntrega}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

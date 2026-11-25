import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { orcamentoParaView } from "@/lib/dados";
import { totalGeral } from "@/lib/calculos";
import { formatarData, formatarMoeda } from "@/lib/formato";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FornecedorFormulario } from "@/components/fornecedor-form";

export const dynamic = "force-dynamic";

export default async function Fornecedor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await prisma.fornecedor.findUnique({
    where: { id },
    include: {
      orcamentos: {
        include: { fornecedor: true, itens: true, lista: { include: { obra: true, itens: { select: { id: true } } } } },
        orderBy: { data: "desc" },
      },
    },
  });
  if (!f) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/fornecedores" className="text-sm text-muted-foreground hover:underline">
          ← Fornecedores
        </Link>
        <h1 className="text-xl font-semibold sm:text-2xl">{f.nome}</h1>
      </div>

      <Card>
        <CardContent className="pt-4">
          <FornecedorFormulario
            valores={{
              id: f.id,
              nome: f.nome,
              telefone: f.telefone ?? "",
              whatsapp: f.whatsapp ?? "",
              email: f.email ?? "",
              cnpj: f.cnpj ?? "",
              observacao: f.observacao ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de orçamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {f.orcamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum orçamento lançado para este fornecedor.</p>
          ) : (
            <ul className="divide-y">
              {f.orcamentos.map((o) => {
                const v = orcamentoParaView(o);
                return (
                  <li key={o.id}>
                    <Link href={`/orcamentos/${o.id}`} className="flex items-center gap-3 py-2 hover:bg-accent">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{o.lista.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatarData(o.data)}
                          {o.lista.obra && ` · ${o.lista.obra.nome}`}
                          {o.numero && ` · nº ${o.numero}`} · {o.itens.length}/{o.lista.itens.length} itens
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">{formatarMoeda(totalGeral(v))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatarData } from "@/lib/formato";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FornecedorFormulario } from "@/components/fornecedor-form";

export const dynamic = "force-dynamic";

export default async function Fornecedores() {
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: { nome: "asc" },
    include: { orcamentos: { select: { data: true }, orderBy: { data: "desc" } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold sm:text-2xl">Fornecedores</h1>

      <Card>
        <CardHeader>
          <CardTitle>Novo fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <FornecedorFormulario />
        </CardContent>
      </Card>

      {fornecedores.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum fornecedor cadastrado ainda.</Card>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {fornecedores.map((f) => (
            <li key={f.id}>
              <Link href={`/fornecedores/${f.id}`} className="flex items-center gap-3 p-3 hover:bg-accent sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.nome}</p>
                  <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    {f.whatsapp && (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" /> {f.whatsapp}
                      </span>
                    )}
                    {f.telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3.5" /> {f.telefone}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>
                    {f.orcamentos.length} {f.orcamentos.length === 1 ? "orçamento" : "orçamentos"}
                  </p>
                  {f.orcamentos[0] && <p className="text-xs">último em {formatarData(f.orcamentos[0].data)}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

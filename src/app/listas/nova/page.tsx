import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ListaCabecalhoFormulario } from "@/components/lista-cabecalho-form";

export const dynamic = "force-dynamic";

export default async function NovaLista() {
  const obras = await prisma.obra.findMany({ orderBy: { nome: "asc" }, select: { nome: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold sm:text-2xl">Nova lista de materiais</h1>
      <Card className="p-4">
        <ListaCabecalhoFormulario obras={obras.map((o) => o.nome)} />
      </Card>
    </div>
  );
}

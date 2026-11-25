import Link from "next/link";
import { cn } from "@/lib/utils";

const ABAS = [
  { chave: "itens", rotulo: "Itens", sufixo: "" },
  { chave: "orcamentos", rotulo: "Orçamentos", sufixo: "/orcamentos" },
  { chave: "comparativo", rotulo: "Comparativo", sufixo: "/comparativo" },
] as const;

export function ListaAbas({
  listaId,
  nome,
  obra,
  ativa,
}: {
  listaId: string;
  nome: string;
  obra?: string | null;
  ativa: (typeof ABAS)[number]["chave"];
}) {
  return (
    <div className="mb-4 space-y-3 print:mb-2">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{nome}</h1>
        {obra && <p className="text-sm text-muted-foreground">Obra: {obra}</p>}
      </div>
      <nav className="flex gap-1 border-b print:hidden">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={`/listas/${listaId}${a.sufixo}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              ativa === a.chave ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}

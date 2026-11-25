import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NaoEncontrado() {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">Essa lista, orçamento ou fornecedor não existe ou foi apagado.</p>
      <Button asChild className="mt-4">
        <Link href="/">Voltar para o início</Link>
      </Button>
    </Card>
  );
}

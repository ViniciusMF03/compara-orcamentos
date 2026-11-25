"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-muted-foreground">Não foi possível carregar esta página. Verifique a conexão e tente de novo.</p>
      <Button className="mt-4" onClick={reset}>
        Tentar novamente
      </Button>
    </Card>
  );
}

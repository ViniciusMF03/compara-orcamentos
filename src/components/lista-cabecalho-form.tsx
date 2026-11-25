"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { apagarLista, criarLista, salvarCabecalhoLista } from "@/app/actions/listas";
import { listaCabecalhoSchema, ROTULO_STATUS, STATUS_LISTA, type ListaCabecalhoForm } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Confirmar } from "@/components/confirmar";
import { Erro } from "@/components/erro";

export function ListaCabecalhoFormulario({
  listaId,
  valores,
  obras,
  resumoApagar,
}: {
  listaId?: string;
  valores?: ListaCabecalhoForm;
  obras: string[];
  resumoApagar?: string;
}) {
  const router = useRouter();
  const form = useForm<ListaCabecalhoForm>({
    resolver: zodResolver(listaCabecalhoSchema),
    defaultValues: valores ?? { nome: "", obraNome: "", status: "ABERTA", observacao: "" },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  async function enviar(dados: ListaCabecalhoForm) {
    if (listaId) {
      const r = await salvarCabecalhoLista(listaId, dados);
      if (!r.ok) return toast.error(r.erro);
      toast.success("Lista salva");
      form.reset(dados);
      router.refresh();
    } else {
      const r = await criarLista(dados);
      if (!r.ok) return toast.error(r.erro);
      toast.success("Lista criada. Agora adicione os itens.");
      router.push(`/listas/${r.dados!.id}`);
    }
  }

  async function apagar() {
    if (!listaId) return;
    const r = await apagarLista(listaId);
    if (!r.ok) return toast.error(r.erro);
    toast.success("Lista apagada");
    router.push("/");
  }

  return (
    <form onSubmit={form.handleSubmit(enviar)} className="grid gap-3 sm:grid-cols-6">
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="nome">Nome da lista</Label>
        <Input id="nome" placeholder='Ex.: "Forro WC"' autoFocus={!listaId} {...form.register("nome")} />
        <Erro msg={errors.nome?.message} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="obraNome">Obra</Label>
        <Input id="obraNome" list="obras" placeholder="Opcional" {...form.register("obraNome")} />
        <datalist id="obras">
          {obras.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1">
        <Label htmlFor="status">Situação</Label>
        <Select id="status" {...form.register("status")}>
          {STATUS_LISTA.map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 sm:col-span-6">
        <Label htmlFor="observacao">Observação</Label>
        <Textarea id="observacao" rows={2} className="min-h-0" {...form.register("observacao")} />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-6">
        <Button type="submit" disabled={isSubmitting || (!!listaId && !isDirty)}>
          {listaId ? "Salvar dados da lista" : "Criar lista"}
        </Button>
        {listaId && (
          <Confirmar
            titulo="Apagar esta lista?"
            descricao={
              <>
                A lista <strong>{valores?.nome}</strong> será apagada junto com {resumoApagar ?? "seus itens e orçamentos"}. Isso não pode ser
                desfeito.
              </>
            }
            onConfirmar={apagar}
          >
            <Button type="button" variant="ghost" className="ml-auto text-destructive">
              <Trash2 /> Apagar lista
            </Button>
          </Confirmar>
        )}
      </div>
    </form>
  );
}

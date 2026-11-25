"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { apagarFornecedor, salvarFornecedor } from "@/app/actions/fornecedores";
import { fornecedorSchema, type FornecedorForm } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Confirmar } from "@/components/confirmar";
import { Erro } from "@/components/erro";

export const FORNECEDOR_VAZIO: FornecedorForm = { nome: "", telefone: "", whatsapp: "", email: "", cnpj: "", observacao: "" };

/**
 * Cadastro de fornecedor. Usado na tela de fornecedores e, em versão compacta,
 * dentro do lançamento de orçamento (onSalvo recebe o novo fornecedor).
 */
export function FornecedorFormulario({
  valores,
  compacto = false,
  onSalvo,
  onCancelar,
  nOrcamentos = 0,
}: {
  nOrcamentos?: number;
  valores?: FornecedorForm;
  compacto?: boolean;
  onSalvo?: (f: { id: string; nome: string }) => void;
  onCancelar?: () => void;
}) {
  const router = useRouter();
  const form = useForm<FornecedorForm>({ resolver: zodResolver(fornecedorSchema), defaultValues: valores ?? FORNECEDOR_VAZIO });
  const { errors, isSubmitting } = form.formState;
  const editando = !!valores?.id;

  async function enviar(dados: FornecedorForm) {
    const r = await salvarFornecedor(dados);
    if (!r.ok) return toast.error(r.erro);
    toast.success(editando ? "Fornecedor salvo" : `Fornecedor "${r.dados!.nome}" cadastrado`);
    if (onSalvo) onSalvo(r.dados!);
    if (!editando) form.reset(FORNECEDOR_VAZIO);
    router.refresh();
  }

  async function apagar() {
    const r = await apagarFornecedor(valores!.id!);
    if (!r.ok) return toast.error(r.erro);
    toast.success("Fornecedor apagado");
    router.push("/fornecedores");
  }

  // Dentro do formulário de orçamento não pode haver <form> aninhado:
  // por isso o envio é feito por botão com handleSubmit.
  return (
    <div
      className="grid gap-3 sm:grid-cols-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          void form.handleSubmit(enviar)();
        }
      }}
    >
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="f-nome">Nome</Label>
        <Input id="f-nome" autoFocus={compacto} {...form.register("nome")} />
        <Erro msg={errors.nome?.message} />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="f-whatsapp">WhatsApp</Label>
        <Input id="f-whatsapp" inputMode="tel" {...form.register("whatsapp")} />
      </div>
      {!compacto && (
        <>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="f-telefone">Telefone</Label>
            <Input id="f-telefone" inputMode="tel" {...form.register("telefone")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="f-email">E-mail</Label>
            <Input id="f-email" type="email" {...form.register("email")} />
            <Erro msg={errors.email?.message} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="f-cnpj">CNPJ</Label>
            <Input id="f-cnpj" inputMode="numeric" {...form.register("cnpj")} />
          </div>
          <div className="space-y-1 sm:col-span-6">
            <Label htmlFor="f-obs">Observação</Label>
            <Textarea id="f-obs" rows={2} className="min-h-0" {...form.register("observacao")} />
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-6">
        <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(enviar)}>
          {editando ? "Salvar fornecedor" : "Cadastrar fornecedor"}
        </Button>
        {onCancelar && (
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        {editando && (
          <Confirmar
            titulo="Apagar fornecedor?"
            descricao={
              nOrcamentos
                ? `"${valores!.nome}" tem ${nOrcamentos} orçamento(s) lançado(s) e só pode ser apagado depois que eles forem apagados.`
                : `"${valores!.nome}" será apagado. Isso não pode ser desfeito.`
            }
            onConfirmar={apagar}
          >
            <Button type="button" variant="ghost" className="ml-auto text-destructive">
              <Trash2 /> Apagar
            </Button>
          </Confirmar>
        )}
      </div>
    </div>
  );
}

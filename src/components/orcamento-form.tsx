"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { apagarOrcamento, salvarOrcamento } from "@/app/actions/orcamentos";
import { orcamentoSchema, type OrcamentoForm } from "@/lib/schemas";
import {
  arred,
  precoPorUnidadePedida,
  quantidadeDiferente,
  totalItem,
  type Conferencia,
  type ItemPedidoCalc,
} from "@/lib/calculos";
import { formatarMoeda, formatarMoedaUnitaria, formatarNumero, parseNumeroBR } from "@/lib/formato";
import { UNIDADES } from "@/lib/colar-lista";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Confirmar } from "@/components/confirmar";
import { Erro } from "@/components/erro";
import { FornecedorFormulario } from "@/components/fornecedor-form";

const OPCOES_CONFERENCIA: { valor: Conferencia; rotulo: string; titulo: string; ativo: string }[] = [
  { valor: "CONFERE", rotulo: "✔", titulo: "Confere", ativo: "bg-emerald-600 text-white border-emerald-600" },
  { valor: "CONFIRMAR", rotulo: "?", titulo: "Confirmar", ativo: "bg-amber-500 text-white border-amber-500" },
  { valor: "DIVERGENTE", rotulo: "⚠", titulo: "Divergente", ativo: "bg-red-600 text-white border-red-600" },
];

export function OrcamentoFormulario({
  orcamentoId,
  itensPedidos,
  fornecedores: fornecedoresIniciais,
  valores,
}: {
  orcamentoId?: string;
  itensPedidos: ItemPedidoCalc[];
  fornecedores: { id: string; nome: string }[];
  valores: OrcamentoForm;
}) {
  const router = useRouter();
  const form = useForm<OrcamentoForm>({ resolver: zodResolver(orcamentoSchema), defaultValues: valores });
  const { errors, isSubmitting } = form.formState;
  const [fornecedores, setFornecedores] = useState(fornecedoresIniciais);
  const [novoFornecedor, setNovoFornecedor] = useState(fornecedoresIniciais.length === 0);

  const w = useWatch({ control: form.control });
  const itensW = w.itens ?? [];
  const totalItensCalc = arred(
    itensW.reduce((s, i) => {
      if (!i?.cotado) return s;
      return s + totalItem({ quantidade: parseNumeroBR(i.quantidade ?? "") ?? 0, valorUnitario: parseNumeroBR(i.valorUnitario ?? "") ?? 0 });
    }, 0),
  );
  const frete = parseNumeroBR(w.frete ?? "") ?? 0;
  const desconto = parseNumeroBR(w.desconto ?? "") ?? 0;
  const totalGeralCalc = arred(totalItensCalc - desconto + frete);
  const totalOriginal = parseNumeroBR(w.totalOriginal ?? "");
  const diferencaOriginal = totalOriginal === null ? null : arred(totalOriginal - totalGeralCalc);
  const nCotados = itensW.filter((i) => i?.cotado).length;

  async function enviar(dados: OrcamentoForm) {
    const r = await salvarOrcamento({ ...dados, id: orcamentoId });
    if (!r.ok) return toast.error(r.erro);
    toast.success("Orçamento salvo");
    router.push(`/listas/${dados.listaId}/orcamentos`);
    router.refresh();
  }

  async function apagar() {
    const r = await apagarOrcamento(orcamentoId!);
    if (!r.ok) return toast.error(r.erro);
    toast.success("Orçamento apagado");
    router.push(`/listas/${valores.listaId}/orcamentos`);
    router.refresh();
  }

  function aoErro() {
    toast.error("Confira os campos marcados em vermelho.");
  }

  return (
    <form onSubmit={form.handleSubmit(enviar, aoErro)} className="space-y-4 pb-24 sm:pb-4">
      <datalist id="unidades">
        {UNIDADES.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      {/* Fornecedor */}
      <Card className="space-y-3 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="fornecedorId">Fornecedor</Label>
            <Select id="fornecedorId" {...form.register("fornecedorId")}>
              <option value="">Escolha…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => setNovoFornecedor((v) => !v)}>
            <Plus /> Novo
          </Button>
        </div>
        <Erro msg={errors.fornecedorId?.message} />
        {novoFornecedor && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="mb-2 text-sm font-medium">Cadastrar fornecedor</p>
            <FornecedorFormulario
              compacto
              onCancelar={fornecedores.length ? () => setNovoFornecedor(false) : undefined}
              onSalvo={(f) => {
                // a <option> precisa existir no DOM antes de selecionar
                flushSync(() => setFornecedores((l) => [...l, f].sort((a, b) => a.nome.localeCompare(b.nome))));
                form.setValue("fornecedorId", f.id, { shouldValidate: true, shouldDirty: true });
                setNovoFornecedor(false);
              }}
            />
          </div>
        )}
      </Card>

      {/* Cabeçalho */}
      <Card className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Campo rotulo="Nº do orçamento" id="numero">
          <Input id="numero" {...form.register("numero")} />
        </Campo>
        <Campo rotulo="Data" id="data" erro={errors.data?.message}>
          <Input id="data" type="date" {...form.register("data")} />
        </Campo>
        <Campo rotulo="Validade" id="validade" erro={errors.validade?.message}>
          <Input id="validade" type="date" {...form.register("validade")} />
        </Campo>
        <Campo rotulo="Em nome de" id="emNomeDe">
          <Input id="emNomeDe" {...form.register("emNomeDe")} />
        </Campo>
        <Campo rotulo="Frete (R$)" id="frete" erro={errors.frete?.message}>
          <Input id="frete" inputMode="decimal" placeholder="0,00" className="text-right" {...form.register("frete")} />
        </Campo>
        <Campo rotulo="Desconto (R$)" id="desconto" erro={errors.desconto?.message}>
          <Input id="desconto" inputMode="decimal" placeholder="0,00" className="text-right" {...form.register("desconto")} />
        </Campo>
        <Campo rotulo="Pagamento" id="condicaoPagamento">
          <Input id="condicaoPagamento" placeholder="à vista, 28 dias…" {...form.register("condicaoPagamento")} />
        </Campo>
        <Campo rotulo="Prazo de entrega" id="prazoEntrega">
          <Input id="prazoEntrega" {...form.register("prazoEntrega")} />
        </Campo>
        <div className="col-span-2 space-y-1 sm:col-span-4">
          <Label htmlFor="observacao">Observação</Label>
          <Textarea id="observacao" rows={2} className="min-h-0" {...form.register("observacao")} />
        </div>
      </Card>

      {/* Itens */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          Itens cotados <span className="text-sm font-normal text-muted-foreground">({nCotados} de {itensPedidos.length})</span>
        </h2>
        {itensPedidos.map((p, i) => (
          <LinhaItem key={p.id} form={form} indice={i} pedido={p} />
        ))}
      </div>

      {/* Totais */}
      <Card className="space-y-2 p-4">
        <Linha rotulo="Itens" valor={totalItensCalc} />
        {desconto > 0 && <Linha rotulo="Desconto" valor={-desconto} />}
        <Linha rotulo="Frete" valor={frete} />
        <Linha rotulo="Total geral" valor={totalGeralCalc} forte />
        <div className="flex flex-wrap items-end gap-3 border-t pt-3">
          <div className="space-y-1">
            <Label htmlFor="totalOriginal">Total do orçamento original (opcional)</Label>
            <Input
              id="totalOriginal"
              inputMode="decimal"
              placeholder="para conferir a digitação"
              className="w-56 text-right"
              {...form.register("totalOriginal")}
            />
            <Erro msg={errors.totalOriginal?.message} />
          </div>
          {diferencaOriginal !== null &&
            (Math.abs(diferencaOriginal) < 0.01 ? (
              <p className="pb-2 text-sm font-medium text-emerald-700">✔ Bate com o orçamento original</p>
            ) : (
              <p className="pb-2 text-sm font-medium text-red-700">
                ⚠ Não bate: o papel diz {formatarMoeda(totalOriginal)}, a soma dá {formatarMoeda(totalGeralCalc)} (diferença de{" "}
                {formatarMoeda(Math.abs(diferencaOriginal))})
              </p>
            ))}
        </div>
      </Card>

      {/* Barra de ações (fixa no celular) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t bg-card/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mr-auto sm:hidden">
          <p className="text-xs text-muted-foreground">Total geral</p>
          <p className="font-semibold tabular-nums">{formatarMoeda(totalGeralCalc)}</p>
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          Salvar orçamento
        </Button>
        {orcamentoId && (
          <Confirmar titulo="Apagar este orçamento?" descricao="O orçamento e todos os valores cotados serão apagados. Isso não pode ser desfeito." onConfirmar={apagar}>
            <Button type="button" variant="ghost" className="text-destructive sm:ml-auto">
              <Trash2 /> <span className="hidden sm:inline">Apagar orçamento</span>
            </Button>
          </Confirmar>
        )}
      </div>
    </form>
  );
}

function Campo({ rotulo, id, erro, children }: { rotulo: string; id: string; erro?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      <Erro msg={erro} />
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className={cn("flex justify-between tabular-nums", forte ? "text-lg font-semibold" : "text-sm")}>
      <span>{rotulo}</span>
      <span>{formatarMoeda(valor)}</span>
    </div>
  );
}

function LinhaItem({ form, indice: i, pedido }: { form: UseFormReturn<OrcamentoForm>; indice: number; pedido: ItemPedidoCalc }) {
  const item = useWatch({ control: form.control, name: `itens.${i}` });
  const erros = form.formState.errors.itens?.[i];
  const cotado = item?.cotado ?? false;
  const qtd = parseNumeroBR(item?.quantidade ?? "") ?? 0;
  const vu = parseNumeroBR(item?.valorUnitario ?? "") ?? 0;
  const total = totalItem({ quantidade: qtd, valorUnitario: vu });
  const cotadoCalc = { quantidade: qtd, unidade: item?.unidade ?? "" };
  const diferente = cotado && qtd > 0 && !!item?.unidade && quantidadeDiferente(pedido, cotadoCalc);
  const precoUn = diferente
    ? precoPorUnidadePedida(pedido, { ...cotadoCalc, valorUnitario: vu, qtdEquivalente: parseNumeroBR(item?.qtdEquivalente ?? "") })
    : null;

  /** Ao mudar quantidade/unidade: sugere CONFIRMAR se ainda não foi conferido manualmente. */
  function aoMudarQtdUnidade() {
    const atual = form.getValues(`itens.${i}`);
    if (atual.conferidoManual) return;
    const q = parseNumeroBR(atual.quantidade) ?? 0;
    const difere = q > 0 && !!atual.unidade && quantidadeDiferente(pedido, { quantidade: q, unidade: atual.unidade });
    form.setValue(`itens.${i}.conferencia`, difere ? "CONFIRMAR" : "CONFERE", { shouldDirty: true });
  }

  const regQtd = form.register(`itens.${i}.quantidade`, { onChange: aoMudarQtdUnidade });
  const regUn = form.register(`itens.${i}.unidade`, { onChange: aoMudarQtdUnidade });

  return (
    <Card className={cn("p-3", !cotado && "bg-muted/60")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">
          <span className="text-muted-foreground">{i + 1}.</span> <strong>{pedido.descricao}</strong>{" "}
          <span className="whitespace-nowrap text-muted-foreground">
            — pedido {formatarNumero(pedido.quantidade)} {pedido.unidade}
          </span>
        </p>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" className="size-4 accent-current" checked={!cotado} onChange={(e) => form.setValue(`itens.${i}.cotado`, !e.target.checked, { shouldDirty: true })} />
          Não cotado
        </label>
      </div>

      {cotado && (
        <div className="mt-2 grid grid-cols-[1fr_4.5rem_6.5rem] gap-2 sm:grid-cols-[1fr_5.5rem_4.5rem_7rem_7rem_auto]">
          <div className="col-span-3 sm:col-span-1">
            <Input placeholder={`Como veio: ${pedido.descricao}`} aria-label="Descrição cotada" {...form.register(`itens.${i}.descricaoCotada`)} />
          </div>
          <div className="col-span-1 sm:col-span-1">
            <Input inputMode="decimal" className="text-right" placeholder="Qtd" aria-label="Quantidade cotada" {...regQtd} />
            <Erro msg={erros?.quantidade?.message} />
          </div>
          <div>
            <Input list="unidades" placeholder="un" aria-label="Unidade cotada" {...regUn} />
            <Erro msg={erros?.unidade?.message} />
          </div>
          <div>
            <Input inputMode="decimal" className="text-right" placeholder="Valor unit." aria-label="Valor unitário" {...form.register(`itens.${i}.valorUnitario`)} />
            <Erro msg={erros?.valorUnitario?.message} />
          </div>
          <div className="col-span-2 flex items-center justify-end text-sm font-semibold tabular-nums sm:col-span-1">
            {formatarMoeda(total)}
          </div>
          <div className="flex items-center justify-end">
            <div role="radiogroup" aria-label="Conferência" className="inline-flex overflow-hidden rounded-md border">
              {OPCOES_CONFERENCIA.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={item?.conferencia === o.valor}
                  title={o.titulo}
                  onClick={() => {
                    form.setValue(`itens.${i}.conferencia`, o.valor, { shouldDirty: true });
                    form.setValue(`itens.${i}.conferidoManual`, true);
                  }}
                  className={cn(
                    "h-9 w-9 border-l text-sm font-semibold first:border-l-0",
                    item?.conferencia === o.valor ? o.ativo : "bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
          </div>

          {diferente && (
            <div className="col-span-3 flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-sm sm:col-span-6">
              <span>Cotado diferente do pedido. Isso rende</span>
              <Input
                inputMode="decimal"
                className="h-8 w-20 text-right"
                placeholder="?"
                aria-label={`Quantidade equivalente em ${pedido.unidade}`}
                {...form.register(`itens.${i}.qtdEquivalente`)}
              />
              <span>{pedido.unidade}</span>
              {precoUn !== null && (
                <span className="ml-auto font-medium">
                  = {formatarMoedaUnitaria(precoUn)}/{pedido.unidade}
                </span>
              )}
            </div>
          )}

          <div className="col-span-3 sm:col-span-6">
            <Input placeholder="Observação (ex.: cotou 4,5x60, pedido era 4,5x45)" aria-label="Observação do item" className="h-8 text-sm" {...form.register(`itens.${i}.observacao`)} />
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ClipboardPaste, Plus, Trash2, X } from "lucide-react";
import { salvarItens } from "@/app/actions/listas";
import { itensListaSchema, type ItensListaForm } from "@/lib/schemas";
import { parseListaColada, UNIDADES, type ItemColado } from "@/lib/colar-lista";
import { formatarNumero, numeroParaCampo } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Confirmar } from "@/components/confirmar";
import { Erro } from "@/components/erro";

export function ItensEditor({
  listaId,
  itens,
  cotacoesPorItem,
}: {
  listaId: string;
  itens: ItensListaForm["itens"];
  /** nº de orçamentos que cotaram cada item (para avisar antes de remover) */
  cotacoesPorItem: Record<string, number>;
}) {
  const router = useRouter();
  const form = useForm<ItensListaForm>({
    resolver: zodResolver(itensListaSchema),
    defaultValues: { itens },
  });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "itens", keyName: "_key" });
  const { errors, isSubmitting, isDirty } = form.formState;

  const [colarAberto, setColarAberto] = useState(itens.length === 0);
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<ItemColado[] | null>(null);

  async function enviar(dados: ItensListaForm) {
    const r = await salvarItens(listaId, dados);
    if (!r.ok) return toast.error(r.erro);
    toast.success("Itens salvos");
    router.refresh();
  }

  function adicionarColados() {
    if (!previa?.length) return;
    append(previa.map((p) => ({ descricao: p.descricao, quantidade: numeroParaCampo(p.quantidade), unidade: p.unidade })));
    toast.success(`${previa.length} ${previa.length === 1 ? "item adicionado" : "itens adicionados"}. Não esqueça de salvar.`);
    setPrevia(null);
    setTexto("");
    setColarAberto(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Itens ({fields.length})</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setColarAberto((v) => !v)}>
          <ClipboardPaste /> Colar lista
        </Button>
      </div>

      {colarAberto && (
        <Card className="space-y-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="colar">Cole uma linha por item</Label>
            <Textarea
              id="colar"
              rows={5}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setPrevia(null);
              }}
              placeholder={"11 placas de 1,20x1,80\n5 quilos de arame 10\n100 parafusos 45 flangeados"}
            />
            <p className="text-xs text-muted-foreground">
              O app separa quantidade, unidade (quilos→kg, metros→m, sacos→sc, peças→pç…; padrão un) e descrição.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setPrevia(parseListaColada(texto))} disabled={!texto.trim()}>
              Ver prévia
            </Button>
            <Button type="button" variant="ghost" onClick={() => setColarAberto(false)}>
              <X /> Fechar
            </Button>
          </div>
          {previa && (
            <div className="space-y-2">
              {previa.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item reconhecido.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-left">
                        <tr>
                          <th className="px-2 py-1 text-right">Qtd</th>
                          <th className="px-2 py-1">Un</th>
                          <th className="px-2 py-1">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previa.map((p, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1 text-right tabular-nums">{formatarNumero(p.quantidade)}</td>
                            <td className="px-2 py-1">{p.unidade}</td>
                            <td className="px-2 py-1">{p.descricao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button type="button" onClick={adicionarColados}>
                    <Plus /> Adicionar {previa.length} {previa.length === 1 ? "item" : "itens"}
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      <form onSubmit={form.handleSubmit(enviar)} className="space-y-3">
        <datalist id="unidades">
          {UNIDADES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        {fields.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum item ainda. Use <strong>Colar lista</strong> ou <strong>Adicionar item</strong>.
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[2rem_1fr_6rem_5rem_6.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
              <span>#</span>
              <span>Descrição</span>
              <span className="text-right">Quantidade</span>
              <span>Unidade</span>
              <span />
            </div>
            {fields.map((f, i) => {
              const nCot = f.id ? (cotacoesPorItem[f.id] ?? 0) : 0;
              const e = errors.itens?.[i];
              const botaoRemover = (
                <Button type="button" variant="ghost" size="icon" title="Remover item" onClick={nCot ? undefined : () => remove(i)}>
                  <Trash2 className="text-destructive" />
                </Button>
              );
              return (
                <div
                  key={f._key}
                  className="grid grid-cols-[1fr_5.5rem_4.5rem] items-start gap-2 rounded-lg border bg-card p-2 sm:grid-cols-[2rem_1fr_6rem_5rem_6.5rem] sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <span className="hidden pt-2 text-right text-sm text-muted-foreground sm:block">{i + 1}</span>
                  <div className="col-span-3 sm:col-span-1">
                    <Input placeholder="Descrição" aria-label={`Descrição do item ${i + 1}`} {...form.register(`itens.${i}.descricao`)} />
                    <Erro msg={e?.descricao?.message} />
                  </div>
                  <div>
                    <Input
                      inputMode="decimal"
                      className="text-right"
                      placeholder="Qtd"
                      aria-label={`Quantidade do item ${i + 1}`}
                      {...form.register(`itens.${i}.quantidade`)}
                    />
                    <Erro msg={e?.quantidade?.message} />
                  </div>
                  <div>
                    <Input list="unidades" placeholder="un" aria-label={`Unidade do item ${i + 1}`} {...form.register(`itens.${i}.unidade`)} />
                    <Erro msg={e?.unidade?.message} />
                  </div>
                  <div className="col-span-3 flex justify-end sm:col-span-1">
                    <Button type="button" variant="ghost" size="icon" title="Subir" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Descer"
                      disabled={i === fields.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    {nCot ? (
                      <Confirmar
                        titulo="Remover item cotado?"
                        descricao={`Este item já foi cotado em ${nCot} orçamento(s). Ao salvar, os valores cotados para ele também serão apagados.`}
                        textoConfirmar="Remover"
                        onConfirmar={() => remove(i)}
                      >
                        {botaoRemover}
                      </Confirmar>
                    ) : (
                      botaoRemover
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-0 -mx-3 flex flex-wrap items-center gap-2 border-t bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
          <Button type="button" variant="outline" onClick={() => append({ descricao: "", quantidade: "1", unidade: "un" })}>
            <Plus /> Adicionar item
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            Salvar itens
          </Button>
          {isDirty && <span className="text-sm text-amber-700">Alterações não salvas</span>}
        </div>
      </form>
    </div>
  );
}

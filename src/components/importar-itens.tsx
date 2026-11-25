"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ClipboardPaste, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { importarArquivo, lerListaDaFoto } from "@/app/actions/importar";
import { parseListaColada, UNIDADES, type ItemColado } from "@/lib/colar-lista";
import { numeroParaCampo, parseNumeroBR } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

/** Item em edição na prévia: quantidade como texto pt-BR. */
export type ItemImportado = { descricao: string; quantidade: string; unidade: string };

const ABAS = [
  { chave: "foto", rotulo: "Foto ou PDF", icone: Camera },
  { chave: "arquivo", rotulo: "Planilha / CSV", icone: FileSpreadsheet },
  { chave: "texto", rotulo: "Colar texto", icone: ClipboardPaste },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

/** Reduz fotos grandes de celular (lado maior 2000 px, JPEG) antes de enviar. */
async function reduzirImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && arquivo.size < 3_000_000) return arquivo;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "lista.jpg", { type: "image/jpeg" }) : arquivo;
  } catch {
    return arquivo; // formato que o navegador não decodifica: envia como está
  }
}

export function ImportarItens({ itens, onChange }: { itens: ItemImportado[]; onChange: (i: ItemImportado[]) => void }) {
  const [aba, setAba] = useState<Aba>("foto");
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const inputFoto = useRef<HTMLInputElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  function adicionar(novos: ItemColado[], origem: string) {
    onChange([...itens, ...novos.map((n) => ({ descricao: n.descricao, quantidade: numeroParaCampo(n.quantidade), unidade: n.unidade }))]);
    toast.success(`${novos.length} ${novos.length === 1 ? "item importado" : "itens importados"} ${origem}. Confira abaixo.`);
  }

  async function enviarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setCarregando(true);
    setAviso("");
    try {
      const fd = new FormData();
      fd.append("arquivo", await reduzirImagem(arquivo));
      const r = await lerListaDaFoto(fd);
      if (!r.ok) return void toast.error(r.erro);
      adicionar(r.dados!.itens, "da foto");
      if (r.dados!.observacao) setAviso(r.dados!.observacao);
    } catch {
      toast.error("Falha ao enviar a foto. Verifique a conexão.");
    } finally {
      setCarregando(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  async function enviarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setCarregando(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      const r = await importarArquivo(fd);
      if (!r.ok) return void toast.error(r.erro);
      adicionar(r.dados!, "do arquivo");
    } catch {
      toast.error("Falha ao enviar o arquivo. Verifique a conexão.");
    } finally {
      setCarregando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  function importarTexto() {
    const novos = parseListaColada(texto);
    if (!novos.length) return void toast.error("Nenhum item reconhecido no texto.");
    adicionar(novos, "do texto");
    setTexto("");
  }

  function alterar(i: number, campo: keyof ItemImportado, valor: string) {
    onChange(itens.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)));
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold">Importar itens</h2>
        <p className="text-sm text-muted-foreground">Opcional: traga a lista de uma foto, planilha ou texto. Você confere antes de criar.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm",
              aba === a.chave ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <a.icone className="size-4" /> {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "foto" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Foto da lista escrita à mão, print do WhatsApp ou PDF. A leitura é feita pela IA do Claude e leva alguns segundos.
          </p>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => enviarFoto(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={carregando} onClick={() => inputFoto.current?.click()}>
            {carregando ? <Loader2 className="animate-spin" /> : <Camera />}
            {carregando ? "Lendo a lista…" : "Tirar ou escolher foto"}
          </Button>
        </div>
      )}

      {aba === "arquivo" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Planilha do Excel (.xlsx) ou CSV com colunas de descrição, quantidade e unidade, em qualquer ordem.
          </p>
          <input
            ref={inputArquivo}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
            className="hidden"
            onChange={(e) => enviarArquivo(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={carregando} onClick={() => inputArquivo.current?.click()}>
            {carregando ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
            {carregando ? "Lendo…" : "Escolher arquivo"}
          </Button>
        </div>
      )}

      {aba === "texto" && (
        <div className="space-y-2">
          <Textarea
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"11 placas de 1,20x1,80\n5 quilos de arame 10\n100 parafusos 45 flangeados"}
            aria-label="Texto da lista"
          />
          <Button type="button" variant="outline" onClick={importarTexto} disabled={!texto.trim()}>
            <ClipboardPaste /> Importar texto
          </Button>
        </div>
      )}

      {aviso && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">⚠ {aviso}</p>}

      {itens.length > 0 && (
        <div className="space-y-2">
          <datalist id="unidades-importar">
            {UNIDADES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {itens.length} {itens.length === 1 ? "item" : "itens"} para a lista
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
              Limpar
            </Button>
          </div>
          {itens.map((it, i) => {
            const qtdInvalida = !((parseNumeroBR(it.quantidade) ?? 0) > 0);
            return (
              <div key={i} className="grid grid-cols-[1fr_5rem_4.5rem_2.25rem] items-center gap-2">
                <Input value={it.descricao} onChange={(e) => alterar(i, "descricao", e.target.value)} aria-label={`Descrição do item ${i + 1}`} />
                <Input
                  value={it.quantidade}
                  inputMode="decimal"
                  className={cn("text-right", qtdInvalida && "border-destructive")}
                  onChange={(e) => alterar(i, "quantidade", e.target.value)}
                  aria-label={`Quantidade do item ${i + 1}`}
                />
                <Input value={it.unidade} list="unidades-importar" onChange={(e) => alterar(i, "unidade", e.target.value)} aria-label={`Unidade do item ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon" title="Remover" onClick={() => onChange(itens.filter((_, j) => j !== i))}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

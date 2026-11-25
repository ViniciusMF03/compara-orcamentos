"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import ExcelJS from "exceljs";
import { parseLinhaPlanilha, parseCsv } from "@/lib/importar";
import { UNIDADES, type ItemColado } from "@/lib/colar-lista";
import type { Resultado } from "@/lib/schemas";

const TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8 MB

// ---- Planilha (.xlsx) ou CSV -------------------------------------------------

export async function importarArquivo(dados: FormData): Promise<Resultado<ItemColado[]>> {
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Escolha um arquivo." };
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "Arquivo muito grande (máximo 8 MB)." };
  const nome = arquivo.name.toLowerCase();

  try {
    if (nome.endsWith(".csv") || nome.endsWith(".txt") || nome.endsWith(".tsv")) {
      const itens = parseCsv(await arquivo.text());
      return itens.length ? { ok: true, dados: itens } : { ok: false, erro: "Nenhum item encontrado no arquivo." };
    }
    if (nome.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await arquivo.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) return { ok: false, erro: "A planilha está vazia." };
      const itens: ItemColado[] = [];
      ws.eachRow((row) => {
        const valores = (row.values as ExcelJS.CellValue[]).slice(1).map(valorCelula);
        const item = parseLinhaPlanilha(valores);
        if (item) itens.push(item);
      });
      return itens.length ? { ok: true, dados: itens } : { ok: false, erro: "Nenhum item encontrado na planilha." };
    }
    return { ok: false, erro: "Formato não suportado. Use .xlsx, .csv ou .txt (ou envie como foto)." };
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo. Ele pode estar corrompido ou protegido." };
  }
}

function valorCelula(v: ExcelJS.CellValue): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "object" && "result" in v) return valorCelula(v.result as ExcelJS.CellValue); // fórmula
  if (typeof v === "object" && "richText" in v) return v.richText.map((t) => t.text).join("");
  if (typeof v === "object" && "text" in v) return String(v.text);
  return String(v);
}

// ---- Foto ou PDF da lista (Claude) -----------------------------------------------

const ItensFotoSchema = z.object({
  itens: z.array(
    z.object({
      quantidade: z.number().describe("Quantidade pedida. Use 1 se não estiver escrita."),
      unidade: z.string().describe(`Unidade abreviada, de preferência uma destas: ${UNIDADES.join(", ")}`),
      descricao: z.string().describe("Descrição do material, como escrita, com medidas e especificações"),
    }),
  ),
  observacao: z.string().describe("Avisos sobre trechos ilegíveis ou dúvidas; vazio se não houver"),
});

const INSTRUCOES = `Você lê listas de materiais de construção (fotos de papel escrito à mão, quadros, prints de WhatsApp, orçamentos ou PDFs) e devolve os itens pedidos.
- Um item por material. Ignore cabeçalhos, totais, preços, nomes de loja, datas e assinaturas.
- Mantenha medidas e especificações na descrição (ex.: "Placa de gesso 1,20x1,80", "Parafuso 4,5x45 flangeado").
- Converta unidades por extenso: quilos→kg, metros→m, metros quadrados→m², sacos→sc, peças→pç, rolos→rl, caixas→cx, pacotes→pct, litros→l, baldes→bd, unidades→un. Sem unidade: un.
- Se um trecho estiver ilegível, inclua o item com o que der para ler e explique em "observacao".
- Escreva em português do Brasil.`;

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function lerListaDaFoto(dados: FormData): Promise<Resultado<{ itens: ItemColado[]; observacao: string }>> {
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Escolha uma foto ou PDF." };
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "Arquivo muito grande (máximo 8 MB)." };

  const ehPdf = arquivo.type === "application/pdf";
  const tipoImagem = TIPOS_IMAGEM.find((t) => t === arquivo.type);
  if (!ehPdf && !tipoImagem) return { ok: false, erro: "Envie uma foto (JPG, PNG, WEBP) ou um PDF." };

  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");
  const anexo: Anthropic.Beta.BetaContentBlockParam = ehPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: tipoImagem!, data: base64 } };

  const client = new Anthropic();
  try {
    const resposta = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // se o modelo recusar por política, a API tenta de novo em um modelo alternativo
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(ItensFotoSchema) },
      system: INSTRUCOES,
      messages: [{ role: "user", content: [anexo, { type: "text", text: "Extraia os itens desta lista de materiais." }] }],
    });

    if (resposta.stop_reason === "refusal") return { ok: false, erro: "Não foi possível ler este arquivo. Tente outra foto." };
    const saida = resposta.parsed_output;
    if (!saida) return { ok: false, erro: "Não consegui entender a lista. Tente uma foto mais nítida." };

    const itens = saida.itens
      .filter((i) => i.descricao.trim())
      .map((i) => ({ quantidade: i.quantidade > 0 ? i.quantidade : 1, unidade: i.unidade.trim() || "un", descricao: i.descricao.trim() }));
    if (itens.length === 0) return { ok: false, erro: "Nenhum item encontrado na imagem." };
    return { ok: true, dados: { itens, observacao: saida.observacao.trim() } };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || (e instanceof Error && /api.?key|credential/i.test(e.message)))
      return { ok: false, erro: "Leitura de fotos não configurada: coloque sua ANTHROPIC_API_KEY no arquivo .env e reinicie o app." };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, erro: "Muitas leituras seguidas. Espere um minuto e tente de novo." };
    if (e instanceof Anthropic.BadRequestError) return { ok: false, erro: "A imagem não pôde ser processada. Tente uma foto menor ou mais nítida." };
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, erro: "Sem conexão com o serviço de leitura. Verifique a internet." };
    return { ok: false, erro: "Não foi possível ler a foto agora. Tente novamente." };
  }
}

/**
 * Dados de exemplo do README: lista "Forro WC" com dois orçamentos.
 * Rodar: npx prisma db seed  (apaga e recria tudo)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Cot = {
  desc: string;
  qtd: number;
  un: string;
  vu: number;
  eq?: number;
  conf?: "CONFERE" | "CONFIRMAR" | "DIVERGENTE";
  obs?: string;
};

const itens: { descricao: string; quantidade: number; unidade: string; loja: Cot; design: Cot }[] = [
  {
    descricao: "Placa de gesso 1,20x1,80",
    quantidade: 11,
    unidade: "un",
    loja: { desc: "Placa de gesso ST 1,20x1,80", qtd: 11, un: "un", vu: 45 },
    design: { desc: "Placa gesso standard 1,20x1,80", qtd: 11, un: "un", vu: 45.32 },
  },
  {
    descricao: "Tabica branca",
    quantidade: 10,
    unidade: "pç",
    loja: { desc: "Tabica branca 3 m", qtd: 10, un: "pç", vu: 15.9 },
    design: { desc: "Tabica 3 m", qtd: 10, un: "pç", vu: 16.6, conf: "CONFIRMAR", obs: "cor não informada" },
  },
  {
    descricao: "Perfil F530",
    quantidade: 12,
    unidade: "pç",
    loja: { desc: "Perfil F530 3 m", qtd: 12, un: "pç", vu: 14.8 },
    design: { desc: "Perfil F530 3 m", qtd: 12, un: "pç", vu: 15 },
  },
  {
    descricao: "Regulador F530",
    quantidade: 35,
    unidade: "un",
    loja: { desc: "Regulador F530", qtd: 35, un: "un", vu: 1.7 },
    design: { desc: "Regulador F530", qtd: 35, un: "un", vu: 1.25 },
  },
  {
    descricao: "Arame nº 10",
    quantidade: 5,
    unidade: "kg",
    loja: { desc: "Arame galvanizado nº 10 rolo 5 kg", qtd: 1, un: "rl", vu: 85, eq: 5 },
    design: { desc: "Arame galvanizado nº 10", qtd: 5, un: "kg", vu: 16.9 },
  },
  {
    descricao: "Bucha nº 6",
    quantidade: 100,
    unidade: "un",
    loja: { desc: "Bucha nº 6", qtd: 100, un: "un", vu: 0.05 },
    design: { desc: "Bucha nº 6 pct c/ 100", qtd: 1, un: "pct", vu: 4, eq: 100 },
  },
  {
    descricao: "Parafuso 45 flangeado",
    quantidade: 100,
    unidade: "un",
    loja: {
      desc: "Parafuso flangeado 4,5x60",
      qtd: 100,
      un: "un",
      vu: 0.24,
      conf: "DIVERGENTE",
      obs: "cotou 4,5x60, pedido era 4,5x45",
    },
    design: { desc: "Parafuso flangeado 4,5x45 pct c/ 100", qtd: 1, un: "pct", vu: 11.92, eq: 100 },
  },
  {
    descricao: "Fita azul",
    quantidade: 1,
    unidade: "un",
    loja: { desc: "Fita azul para drywall", qtd: 1, un: "un", vu: 27.5 },
    design: { desc: "Fita azul", qtd: 1, un: "un", vu: 24.9 },
  },
  {
    descricao: "Massa",
    quantidade: 15,
    unidade: "kg",
    loja: { desc: "Massa para drywall balde 25 kg", qtd: 1, un: "bd", vu: 69.9, eq: 25, conf: "CONFIRMAR", obs: "balde de 25 kg, pedido 15 kg" },
    design: { desc: "Massa pronta balde 25 kg", qtd: 1, un: "bd", vu: 63.95, eq: 25, conf: "CONFIRMAR", obs: "balde de 25 kg, pedido 15 kg" },
  },
  {
    descricao: "Gesso",
    quantidade: 20,
    unidade: "kg",
    loja: { desc: "Gesso em pó sc 20 kg", qtd: 1, un: "sc", vu: 26, eq: 20 },
    design: { desc: "Gesso em pó sc 40 kg", qtd: 1, un: "sc", vu: 47, eq: 40, conf: "DIVERGENTE", obs: "saco de 40 kg, pedido 20 kg" },
  },
];

function dia(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

async function main() {
  await prisma.itemCotado.deleteMany();
  await prisma.orcamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.lista.deleteMany();
  await prisma.obra.deleteMany();
  await prisma.fornecedor.deleteMany();

  const obra = await prisma.obra.create({ data: { nome: "Imasul" } });
  const loja = await prisma.fornecedor.create({ data: { nome: "Loja do Gesso", telefone: "(67) 3333-0001" } });
  const design = await prisma.fornecedor.create({ data: { nome: "Design Gesso", whatsapp: "(67) 99999-0002" } });

  const lista = await prisma.lista.create({
    data: {
      nome: "Forro WC",
      obraId: obra.id,
      itens: {
        create: itens.map((it, i) => ({
          ordem: i + 1,
          descricao: it.descricao,
          quantidade: it.quantidade,
          unidade: it.unidade,
        })),
      },
    },
    include: { itens: { orderBy: { ordem: "asc" } } },
  });

  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daqui = (dias: number) => iso(new Date(hoje.getTime() + dias * 86_400_000));

  for (const [forn, chave, frete, numero] of [
    [loja, "loja", 100, "1542"],
    [design, "design", 85, "OR-0387"],
  ] as const) {
    await prisma.orcamento.create({
      data: {
        listaId: lista.id,
        fornecedorId: forn.id,
        numero,
        data: dia(daqui(0)),
        validade: dia(daqui(chave === "loja" ? 7 : 2)),
        frete,
        condicaoPagamento: chave === "loja" ? "28 dias" : "à vista",
        prazoEntrega: chave === "loja" ? "2 dias úteis" : "imediato",
        emNomeDe: "Imasul",
        itens: {
          create: lista.itens.map((ip, i) => {
            const c = itens[i][chave];
            return {
              itemPedidoId: ip.id,
              descricaoCotada: c.desc,
              quantidade: c.qtd,
              unidade: c.un,
              valorUnitario: c.vu,
              qtdEquivalente: c.eq ?? null,
              conferencia: c.conf ?? "CONFERE",
              observacao: c.obs ?? null,
            };
          }),
        },
      },
    });
  }

  console.log("Seed concluído: lista 'Forro WC' com 2 orçamentos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

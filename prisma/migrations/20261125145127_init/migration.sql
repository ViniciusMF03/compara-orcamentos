-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Lista" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "obraId" TEXT,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "observacao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lista_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL,
    "unidade" TEXT NOT NULL,
    CONSTRAINT "ItemPedido_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "Lista" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "cnpj" TEXT,
    "observacao" TEXT
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listaId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "numero" TEXT,
    "data" DATETIME NOT NULL,
    "validade" DATETIME,
    "frete" DECIMAL NOT NULL DEFAULT 0,
    "desconto" DECIMAL NOT NULL DEFAULT 0,
    "condicaoPagamento" TEXT,
    "prazoEntrega" TEXT,
    "emNomeDe" TEXT,
    "observacao" TEXT,
    "anexo" TEXT,
    "totalOriginal" DECIMAL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Orcamento_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "Lista" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Orcamento_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemCotado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orcamentoId" TEXT NOT NULL,
    "itemPedidoId" TEXT NOT NULL,
    "descricaoCotada" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL,
    "unidade" TEXT NOT NULL,
    "valorUnitario" DECIMAL NOT NULL,
    "qtdEquivalente" DECIMAL,
    "conferencia" TEXT NOT NULL DEFAULT 'CONFERE',
    "observacao" TEXT,
    CONSTRAINT "ItemCotado_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCotado_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "ItemPedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Obra_nome_key" ON "Obra"("nome");

-- CreateIndex
CREATE INDEX "ItemPedido_listaId_idx" ON "ItemPedido"("listaId");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_nome_key" ON "Fornecedor"("nome");

-- CreateIndex
CREATE INDEX "Orcamento_listaId_idx" ON "Orcamento"("listaId");

-- CreateIndex
CREATE INDEX "Orcamento_fornecedorId_idx" ON "Orcamento"("fornecedorId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCotado_orcamentoId_itemPedidoId_key" ON "ItemCotado"("orcamentoId", "itemPedidoId");

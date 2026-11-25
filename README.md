# 🧱 Compara Orçamentos

App web para **comparar orçamentos de materiais de obra**.

O usuário cadastra uma **lista de materiais** (o que precisa comprar), lança quantos **orçamentos de fornecedores** quiser para essa lista e o app mostra:

- o **fornecedor mais barato em cada item**;
- o **total de cada orçamento** (itens + frete);
- se cada **produto cotado confere** com o que foi pedido (medida, cor, quantidade, embalagem);
- a **melhor forma de comprar**: tudo num fornecedor só ou dividido entre fornecedores, **já contando os fretes**.

O app serve para **qualquer obra, qualquer lista e qualquer número de fornecedores**. A primeira versão é para um usuário só (o comprador), usada no computador e no celular.

---

## 🤖 Instruções para o Claude (leia primeiro)

Você vai construir este app do zero neste repositório, rodando no **GitHub Codespaces**.

1. Siga a **stack** e o **modelo de dados** abaixo. Se precisar decidir algo que não está aqui, escolha a opção mais simples e anote no final deste README, na seção "Decisões tomadas".
2. Construa na ordem do **Roteiro**. Ao fim de cada etapa, rode o app, confira que funciona e faça um commit.
3. **Toda a interface é em português do Brasil**: valores em reais (`R$ 1.234,56`), datas `dd/mm/aaaa`, números com vírgula decimal.
4. A tela precisa funcionar bem no **celular** (o usuário consulta na obra).
5. Os cálculos ficam em **funções puras e testadas** (`src/lib/calculos.ts`), separadas das telas.
6. No fim, o app precisa passar em todos os **Critérios de aceite**.

---

## 🛠️ Stack

| Camada | Tecnologia |
| --- | --- |
| Linguagem | **TypeScript** |
| Framework | **Next.js** (App Router) com Server Actions |
| Banco de dados | **SQLite** com **Prisma** (fácil trocar para PostgreSQL no deploy) |
| Interface | **Tailwind CSS** + **shadcn/ui** |
| Formulários e validação | React Hook Form + Zod |
| Testes | Vitest (cálculos) |
| Ambiente | GitHub Codespaces, Node 20+ |
| Deploy (futuro) | Vercel + PostgreSQL (Neon ou Supabase) |

---

## 🗂️ Modelo de dados

```
Obra ──< Lista ──< ItemPedido
             │            │
             └──< Orcamento ──< ItemCotado >── ItemPedido
                     │
Fornecedor ──────────┘
```

### Obra
| campo | tipo | obs |
| --- | --- | --- |
| id | string (cuid) | |
| nome | string | ex.: "Imasul", "Residencial X" |
| endereco | string? | |
| criadoEm | DateTime | |

### Lista (lista de materiais)
| campo | tipo | obs |
| --- | --- | --- |
| id | string | |
| obraId | string? | lista pode existir sem obra |
| nome | string | ex.: "Forro WC" |
| status | enum | `ABERTA` · `COMPRADA` · `CANCELADA` |
| observacao | string? | |
| criadoEm | DateTime | |

### ItemPedido (o que eu preciso)
| campo | tipo | obs |
| --- | --- | --- |
| id | string | |
| listaId | string | |
| ordem | int | posição na lista |
| descricao | string | ex.: "Parafuso 45 flangeado" |
| quantidade | Decimal | |
| unidade | string | `un`, `pç`, `kg`, `m`, `m²`, `rl`, `sc`, `cx`, `pct`, `l`, `bd` (lista editável) |

### Fornecedor
| campo | tipo | obs |
| --- | --- | --- |
| id | string | |
| nome | string | único |
| telefone | string? | |
| whatsapp | string? | |
| email | string? | |
| cnpj | string? | |
| observacao | string? | |

### Orcamento (a cotação de um fornecedor para uma lista)
| campo | tipo | obs |
| --- | --- | --- |
| id | string | |
| listaId | string | |
| fornecedorId | string | |
| numero | string? | número do orçamento do fornecedor |
| data | Date | |
| validade | Date? | |
| frete | Decimal | padrão 0 |
| desconto | Decimal | padrão 0 (desconto geral do orçamento) |
| condicaoPagamento | string? | ex.: "à vista", "28 dias" |
| prazoEntrega | string? | |
| emNomeDe | string? | cliente que aparece no orçamento |
| observacao | string? | |
| anexo | string? | caminho do PDF ou foto enviado (fase 2) |

### ItemCotado (o que o fornecedor cotou para cada item pedido)
| campo | tipo | obs |
| --- | --- | --- |
| id | string | |
| orcamentoId | string | |
| itemPedidoId | string | |
| descricaoCotada | string | como veio no orçamento |
| quantidade | Decimal | quantidade cotada |
| unidade | string | unidade cotada |
| valorUnitario | Decimal | |
| conferencia | enum | `CONFERE` · `CONFIRMAR` · `DIVERGENTE` |
| observacao | string? | ex.: "cotou 4,5x60, pedido era 4,5x45" |

Regras:
- Um orçamento pode **não cotar** algum item da lista. Nesse caso não existe ItemCotado e o item aparece como **"não cotado"**.
- Cada par (orçamento, item pedido) tem **no máximo um** ItemCotado.
- Apagar uma lista apaga os orçamentos e itens dela (cascade). Antes de apagar, pedir confirmação.

---

## 🧮 Regras de cálculo (`src/lib/calculos.ts`)

```
totalItem(itemCotado)    = quantidade × valorUnitario
totalItens(orcamento)    = soma de totalItem dos itens cotados
totalGeral(orcamento)    = totalItens − desconto + frete
itensFaltando(orcamento) = itens da lista sem ItemCotado nesse orçamento
```

### Comparativo por item
Para cada ItemPedido:
- mostrar o total de cada orçamento (ou "não cotado");
- **mais barato** = menor `totalItem` entre os orçamentos que cotaram;
- **diferença** = segundo menor − menor;
- itens `DIVERGENTE` entram no cálculo, mas com um ⚠ ao lado do valor.

### Melhor forma de comprar (com fretes)
Testar **todas as combinações de fornecedores** (subconjuntos dos orçamentos da lista):
- para cada combinação, cada item é comprado no mais barato **dentro dela**;
- custo = soma dos itens escolhidos + soma dos **fretes** (e descontos) dos fornecedores que forem usados;
- só valem combinações que **cobrem todos os itens**;
- mostrar a **combinação mais barata**, quais itens comprar em cada fornecedor e quanto economiza em relação ao melhor orçamento único.

Como uma lista costuma ter poucos orçamentos (até ~10), testar todas as combinações (2ⁿ) é viável. Acima de 12 orçamentos, usar uma heurística gulosa e avisar na tela.

Também mostrar:
- **melhor orçamento único** (menor `totalGeral` entre os que cotaram todos os itens);
- os orçamentos que **não cotaram tudo**, com a lista do que falta.

### Preço por unidade (comparação justa)
Quando a quantidade ou unidade cotada for diferente da pedida (ex.: pediu 20 kg e cotaram saco de 40 kg), mostrar também o **preço por unidade pedida** (R$/kg) e marcar o item como `CONFIRMAR` automaticamente, se ainda não tiver sido conferido.

---

## 🖥️ Telas

1. **Início (`/`)**: listas abertas (nome, obra, nº de orçamentos, melhor total), botão "Nova lista" e busca.
2. **Nova lista / editar lista (`/listas/[id]`)**
   - nome, obra e observação;
   - itens em tabela editável (descrição, quantidade, unidade), com adicionar, remover e reordenar;
   - **colar lista**: uma caixa de texto onde o usuário cola uma linha por item, como
     `11 placas de 1,20x1,80` · `5 quilos de arame 10` · `100 parafusos 45 flangeados`.
     O app separa **quantidade**, **unidade** (quilos→kg, metros→m, sacos→sc, peças→pç; padrão `un`) e **descrição**, mostra uma prévia e o usuário confirma.
3. **Orçamentos da lista (`/listas/[id]/orcamentos`)**: cards com fornecedor, total geral, validade (com aviso se vencido ou vencendo em até 2 dias), itens faltando e botão "Novo orçamento".
4. **Lançar / editar orçamento (`/orcamentos/[id]`)**
   - escolher o fornecedor ou cadastrar um novo ali mesmo;
   - cabeçalho: número, data, validade, frete, desconto, pagamento, prazo, em nome de;
   - **uma linha para cada item da lista**, já preenchida com o item pedido. O usuário preenche descrição cotada, quantidade, unidade e valor unitário, ou marca "não cotado";
   - seletor de conferência (✔ Confere / ? Confirmar / ⚠ Divergente) e observação;
   - total calculado ao vivo e conferência de que bate com o total do papel (campo opcional "total do orçamento original" que avisa se a soma não bater).
5. **Comparativo (`/listas/[id]/comparativo`)**: **a tela principal**
   - resumo no topo: melhor orçamento único, melhor combinação e economia;
   - tabela: linhas = itens, colunas = orçamentos; menor valor de cada linha em verde, não cotado em cinza, divergente com ⚠;
   - linhas finais: subtotal, desconto, frete e total geral;
   - no celular, um card por item em vez da tabela larga;
   - botões: **Exportar Excel (.xlsx)**, **Imprimir/PDF** e **Copiar resumo para WhatsApp** (texto com o que comprar em cada fornecedor).
6. **Fornecedores (`/fornecedores`)**: cadastro e lista, com o histórico de orçamentos de cada um.

---

## 🗺️ Roteiro

1. **Setup**: criar o projeto Next.js + TypeScript + Tailwind + shadcn/ui + Prisma (SQLite) na raiz do repositório, **sem apagar este README**. Configurar `npm run dev` para escutar em `0.0.0.0:3000`.
2. **Banco**: schema Prisma conforme o modelo, migração e `prisma/seed.ts` com os dados de exemplo abaixo.
3. **Cálculos**: `src/lib/calculos.ts` + testes Vitest (incluindo o exemplo abaixo).
4. **Listas**: CRUD, itens editáveis e "colar lista".
5. **Fornecedores**: CRUD.
6. **Orçamentos**: lançar e editar, com totais ao vivo.
7. **Comparativo**: tabela, resumo, melhor combinação e versão celular.
8. **Exportar**: Excel, impressão e resumo para WhatsApp.
9. **Acabamento**: estados vazios, confirmações antes de apagar, mensagens de erro em português, `.devcontainer/devcontainer.json` para o Codespace já abrir pronto.

---

## 🌱 Dados de exemplo (seed e teste)

**Lista "Forro WC"**: 11 un placa de gesso 1,20x1,80 · 10 pç tabica branca · 12 pç perfil F530 · 35 un regulador F530 · 5 kg arame nº 10 · 100 un bucha nº 6 · 100 un parafuso 45 flangeado · 1 un fita azul · 15 kg massa · 20 kg gesso.

| Item | Loja do Gesso (qtd × unit.) | Design Gesso (qtd × unit.) |
| --- | --- | --- |
| Placa | 11 × 45,00 | 11 × 45,32 |
| Tabica | 10 × 15,90 | 10 × 16,60 (cor não informada → CONFIRMAR) |
| Perfil F530 | 12 × 14,80 | 12 × 15,00 |
| Regulador | 35 × 1,70 | 35 × 1,25 |
| Arame | 1 rl (5 kg) × 85,00 | 5 kg × 16,90 |
| Bucha | 100 × 0,05 | 1 pct (100) × 4,00 |
| Parafuso | 100 × 0,24 (4,5x60 → DIVERGENTE) | 1 pct (100) × 11,92 (4,5x45) |
| Fita | 1 × 27,50 | 1 × 24,90 |
| Massa | 1 balde 25 kg × 69,90 (→ CONFIRMAR) | 1 balde 25 kg × 63,95 (→ CONFIRMAR) |
| Gesso | 1 sc 20 kg × 26,00 | 1 sc 40 kg × 47,00 (→ DIVERGENTE) |
| **Frete** | **100,00** | **85,00** |

**Resultados esperados (usar como teste):**
- Loja do Gesso: itens R$ 1.128,50 + frete R$ 100,00 = **R$ 1.228,50**
- Design Gesso: itens R$ 1.124,54 + frete R$ 85,00 = **R$ 1.209,54**
- Melhor orçamento único: **Design Gesso**, economia de **R$ 18,96**
- Comprar o mais barato de cada item nos dois fornecedores: R$ 1.090,62 + R$ 185,00 de frete = **R$ 1.275,62**, mais caro que o único
- Melhor combinação: **só Design Gesso (R$ 1.209,54)**

---

## 🚀 Como rodar no Codespaces

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abrir a **porta 3000** quando o Codespaces avisar (**Open in Browser**).

Testes:
```bash
npm test
```

---

## 🔮 Fase 2 (depois do MVP)

- **Ler o orçamento automaticamente**: enviar o PDF ou a foto do orçamento, extrair os itens com a API do Claude (chave em `ANTHROPIC_API_KEY` no `.env`) e já casar cada linha com o item pedido. O usuário só revisa e confirma.
- Login (Auth.js) e mais de um usuário por empresa.
- Histórico de preços por material e fornecedor ("da última vez paguei quanto?").
- Enviar o pedido de cotação para o fornecedor por WhatsApp/e-mail direto do app.
- Deploy na Vercel com PostgreSQL.

---

## 📝 Decisões tomadas

- **Versões fixadas**: Next.js 15.5, React 19, Prisma 6.19, Tailwind 4, Zod 3, Vitest 3. São versões estáveis e conhecidas; o Prisma 7/8 muda bastante a configuração e pode ser atualizado depois.
- **`.env` automático**: o `npm install` cria o `.env` a partir do `.env.example` (script `scripts/setup-env.mjs`), então os passos de "Como rodar" funcionam sem configuração manual. O `.env` não vai para o Git.
- **Enums como texto**: `Lista.status` e `ItemCotado.conferencia` são `String` no banco e validados no app (Zod + tipos TS). Assim o mesmo schema funciona em SQLite e PostgreSQL sem migração especial.
- **Campos extras no modelo**:
  - `ItemCotado.qtdEquivalente`: quanto o item cotado rende na unidade pedida (ex.: 1 sc = 40 kg → 40). É o que permite calcular o **preço por unidade pedida** (R$/kg) quando a embalagem é diferente.
  - `Orcamento.totalOriginal`: o total impresso no papel, guardado para a conferência de digitação.
  - `Orcamento.criadoEm`: ordem das colunas no comparativo.
  - `Obra.nome` é único: na lista, a obra é digitada (com sugestões) e criada automaticamente se não existir. Não há tela própria de obras.
- **Unidades**: lista fixa de sugestões (`un`, `pç`, `kg`, `m`, `m²`, `rl`, `sc`, `cx`, `pct`, `l`, `bd`) num campo com autocompletar; o usuário pode digitar outra unidade. Fica em `src/lib/colar-lista.ts`.
- **Dinheiro**: valores ficam como `Decimal` no banco e viram `number` nas telas. Cada `totalItem` é arredondado a centavos e as somas são feitas sobre os valores arredondados (igual a uma calculadora). Preço por unidade usa até 4 casas (R$ 0,1192/un).
- **Datas**: guardadas ao meio-dia UTC para o dia não "pular" por causa do fuso horário.
- **Melhor combinação**: testa todos os subconjuntos de orçamentos até 12; acima disso usa uma heurística gulosa (e avisa na tela). Frete e desconto de um orçamento só contam se pelo menos um item for comprado nele. Em empate de custo, prefere a combinação com menos fornecedores.
- **"Melhor total" na tela inicial** = custo da melhor combinação.
- **Conferência automática**: ao lançar, se a quantidade ou unidade cotada for diferente da pedida, o item vira `CONFIRMAR` sozinho, até o usuário clicar em um dos botões de conferência (aí vale a escolha dele). Itens já salvos contam como conferidos.
- **Orçamento parcial**: cada linha começa como "cotado"; o usuário preenche o valor ou marca "não cotado". Sem valor, o formulário não deixa salvar.
- **Fornecedor com orçamentos não pode ser apagado** (o banco usa `Restrict`); a tela explica e pede para apagar os orçamentos antes. Apagar lista apaga itens e orçamentos (cascade), com confirmação.
- **Excel** gerado no servidor com `exceljs` (rota `/listas/[id]/comparativo/excel`): planilha "Comparativo" (mais barato em verde, observações como comentário da célula) e "Melhor compra".
- **Imprimir/PDF** usa a impressão do navegador com CSS próprio (A4 paisagem, sem menus, tabela completa mesmo no celular).
- **WhatsApp**: copia o resumo para a área de transferência; se o navegador bloquear, abre `wa.me` com o texto.
- **shadcn/ui**: os componentes usados (Button, Input, Card, Badge, AlertDialog) estão em `src/components/ui`, no mesmo formato que o CLI do shadcn gera (`components.json` incluído para adicionar outros com `npx shadcn add`).
- **Importar itens na "Nova lista"**: além de digitar, a lista pode nascer de uma **foto/PDF** (lida pelo Claude, modelo `claude-opus-5-5` com saída estruturada), de uma **planilha .xlsx/CSV** (colunas de descrição, quantidade e unidade em qualquer ordem; coluna de nº do item é ignorada) ou de **texto colado**. Os itens aparecem numa prévia editável e são criados junto com a lista. Fotos de celular são reduzidas no navegador (lado maior 2000 px) antes do envio; limite de 8 MB por arquivo.
- **Chave da API**: a leitura de fotos precisa de `ANTHROPIC_API_KEY` no `.env` (ver `.env.example`); sem ela, a tela mostra como configurar e o resto do app funciona. A requisição usa o *fallback* do servidor (`fallbacks: "default"`): se o modelo recusar por política, a API tenta em um modelo alternativo.
- **Rotas de criação**: `/listas/nova` e `/orcamentos/novo?lista=<id>`; a edição fica em `/listas/[id]` e `/orcamentos/[id]`, como pedido.

---

## 👤 Autor

**Vinícius Macedo Ferrer**: compras para obras e estudante de Análise e Desenvolvimento de Sistemas.
GitHub: [@ViniciusMF03](https://github.com/ViniciusMF03)

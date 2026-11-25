import { describe, expect, it } from "vitest";
import { parseCsv, parseLinhaPlanilha } from "./importar";

describe("importar planilha", () => {
  it("colunas separadas: quantidade, unidade, descrição em qualquer ordem", () => {
    expect(parseLinhaPlanilha([11, "un", "Placa de gesso 1,20x1,80"])).toEqual({ quantidade: 11, unidade: "un", descricao: "Placa de gesso 1,20x1,80" });
    expect(parseLinhaPlanilha(["Arame nº 10", "5", "quilos"])).toEqual({ quantidade: 5, unidade: "kg", descricao: "Arame nº 10" });
    expect(parseLinhaPlanilha(["Gesso", 20, "KG"])).toMatchObject({ quantidade: 20, unidade: "kg" });
  });

  it("uma coluna só usa o parser de colar lista", () => {
    expect(parseLinhaPlanilha(["5 quilos de arame 10"])).toEqual({ quantidade: 5, unidade: "kg", descricao: "Arame 10" });
  });

  it("ignora cabeçalho e linhas vazias", () => {
    expect(parseLinhaPlanilha(["Descrição", "Qtd", "Unidade"])).toBeNull();
    expect(parseLinhaPlanilha([null, "", undefined])).toBeNull();
  });

  it("m³ e unidade desconhecida em coluna própria", () => {
    expect(parseLinhaPlanilha(["Areia média", 2, "m3"])).toEqual({ quantidade: 2, unidade: "m³", descricao: "Areia média" });
    expect(parseLinhaPlanilha(["Cano PVC 25mm", 6, "barras"])).toEqual({ quantidade: 6, unidade: "barras", descricao: "Cano PVC 25mm" });
  });

  it("coluna de nº do item não vira quantidade", () => {
    expect(parseLinhaPlanilha([1, "Placa de gesso 1,20x1,80", 11, "un"])).toEqual({ quantidade: 11, unidade: "un", descricao: "Placa de gesso 1,20x1,80" });
    expect(parseLinhaPlanilha([4, "Fita azul", 1])).toEqual({ quantidade: 1, unidade: "un", descricao: "Fita azul" });
    expect(parseLinhaPlanilha([11, "un", "Placa"])).toMatchObject({ quantidade: 11, unidade: "un" });
  });

  it("sem unidade assume un", () => {
    expect(parseLinhaPlanilha(["Fita azul", 1])).toEqual({ quantidade: 1, unidade: "un", descricao: "Fita azul" });
  });

  it("CSV com ponto e vírgula e decimal com vírgula", () => {
    expect(parseCsv("Descrição;Qtd;Un\nMassa;1,5;kg\n\"Bucha nº 6; branca\";100;un")).toEqual([
      { quantidade: 1.5, unidade: "kg", descricao: "Massa" },
      { quantidade: 100, unidade: "un", descricao: "Bucha nº 6; branca" },
    ]);
  });
});

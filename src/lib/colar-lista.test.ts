import { describe, expect, it } from "vitest";
import { parseLinha, parseListaColada } from "./colar-lista";
import { formatarData, formatarMoeda, parseNumeroBR } from "./formato";

describe("colar lista", () => {
  it("exemplos do README", () => {
    expect(parseListaColada("11 placas de 1,20x1,80\n5 quilos de arame 10\n100 parafusos 45 flangeados")).toEqual([
      { quantidade: 11, unidade: "un", descricao: "Placas de 1,20x1,80" },
      { quantidade: 5, unidade: "kg", descricao: "Arame 10" },
      { quantidade: 100, unidade: "un", descricao: "Parafusos 45 flangeados" },
    ]);
  });

  it("reconhece unidades por extenso e abreviadas", () => {
    expect(parseLinha("3 metros de cantoneira")).toMatchObject({ quantidade: 3, unidade: "m", descricao: "Cantoneira" });
    expect(parseLinha("2 sacos de cimento")).toMatchObject({ unidade: "sc", descricao: "Cimento" });
    expect(parseLinha("10 peças tabica")).toMatchObject({ unidade: "pç" });
    expect(parseLinha("4 rolos de fita")).toMatchObject({ unidade: "rl" });
    expect(parseLinha("12,5 m2 de piso")).toMatchObject({ quantidade: 12.5, unidade: "m²", descricao: "Piso" });
    expect(parseLinha("20 metros quadrados de forro")).toMatchObject({ quantidade: 20, unidade: "m²", descricao: "Forro" });
    expect(parseLinha("5kg massa")).toMatchObject({ quantidade: 5, unidade: "kg", descricao: "Massa" });
    expect(parseLinha("10x parafuso")).toMatchObject({ quantidade: 10, unidade: "un", descricao: "Parafuso" });
    expect(parseLinha("2 baldes de massa")).toMatchObject({ unidade: "bd" });
  });

  it("sem quantidade assume 1 un; ignora linhas vazias e marcadores", () => {
    expect(parseListaColada("- fita azul\n\n   \n• 2 cx de luva")).toEqual([
      { quantidade: 1, unidade: "un", descricao: "Fita azul" },
      { quantidade: 2, unidade: "cx", descricao: "Luva" },
    ]);
  });

  it("medida no início não vira quantidade", () => {
    expect(parseLinha("1,20x1,80 placa")).toMatchObject({ quantidade: 1, descricao: "1,20x1,80 placa" });
  });
});

describe("formato pt-BR", () => {
  it("lê números com vírgula decimal", () => {
    expect(parseNumeroBR("1.234,56")).toBe(1234.56);
    expect(parseNumeroBR("45,32")).toBe(45.32);
    expect(parseNumeroBR("0.24")).toBe(0.24);
    expect(parseNumeroBR("R$ 85")).toBe(85);
    expect(parseNumeroBR("abc")).toBeNull();
    expect(parseNumeroBR("")).toBeNull();
  });

  it("formata moeda e data", () => {
    expect(formatarMoeda(1234.56)).toBe("R$ 1.234,56");
    expect(formatarData(new Date("2026-11-25T12:00:00Z"))).toBe("25/11/2026");
  });
});

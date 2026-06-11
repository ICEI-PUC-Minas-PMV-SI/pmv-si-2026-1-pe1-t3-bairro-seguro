/**
 * ============================================================
 *  BAIRRO SEGURO — Testes Unitários
 *  Ferramenta: Jest + jsdom
 *  Arquivo testado: src/assets/utils.js
 * ============================================================
 *
 *  COMO RODAR:
 *    1. Na raiz do projeto, instale as dependências:
 *         npm install --save-dev jest jest-environment-jsdom
 *
 *    2. No package.json, adicione (ou crie o arquivo):
 *         {
 *           "scripts": { "test": "jest" },
 *           "jest": { "testEnvironment": "jsdom" }
 *         }
 *
 *    3. Copie este arquivo para a raiz do projeto e execute:
 *         npm test
 * ============================================================
 */

// ── Carrega as funções do utils.js no ambiente de teste ──────
// Como utils.js usa localStorage diretamente (sem export),
// precisamos injetar as funções no escopo global manualmente.

const fs = require("fs");
const path = require("path");

const utilsCode = fs.readFileSync(
  path.join(__dirname, "src/assets/utils.js"),
  "utf8"
);

// Executa o código no escopo global (simula o <script> no browser)
eval(utilsCode);


// ════════════════════════════════════════════════════════════
//  BLOCO 1 — normalizeCep
//  Testa a formatação do CEP (entrada → "XXXXX-XXX")
// ════════════════════════════════════════════════════════════

describe("normalizeCep", () => {

  // ── Caso padrão: 8 dígitos sem máscara ──────────────────
  test("formata 8 dígitos como XXXXX-XXX", () => {
    // Arrange
    const cepSemMascara = "30130010";

    // Act
    const resultado = normalizeCep(cepSemMascara);

    // Assert
    expect(resultado).toBe("30130-010");
  });

  // ── Entrada já com traço ─────────────────────────────────
  test("aceita entrada já formatada", () => {
    expect(normalizeCep("30130-010")).toBe("30130-010");
  });

  // ── Entrada com pontos e espaços (deve limpar e formatar) ─
  test("remove caracteres não numéricos antes de formatar", () => {
    expect(normalizeCep("30.130-010")).toBe("30130-010");
  });

  // ── CEP incompleto deve retornar vazio ───────────────────
  test("retorna string vazia para CEP incompleto", () => {
    expect(normalizeCep("3013001")).toBe("");
  });

  // ── Entrada vazia ────────────────────────────────────────
  test("retorna string vazia para entrada vazia", () => {
    expect(normalizeCep("")).toBe("");
    expect(normalizeCep(null)).toBe("");
    expect(normalizeCep(undefined)).toBe("");
  });

  // ── CEP com mais de 8 dígitos deve truncar ───────────────
  test("trunca para os primeiros 8 dígitos se houver mais", () => {
    expect(normalizeCep("301300109999")).toBe("30130-010");
  });
});


// ════════════════════════════════════════════════════════════
//  BLOCO 2 — normalizeOcorrencia
//  Testa a normalização de um objeto de ocorrência
// ════════════════════════════════════════════════════════════

describe("normalizeOcorrencia", () => {

  // ── Objeto válido e completo ─────────────────────────────
  test("retorna ocorrência normalizada para objeto válido", () => {
    // Arrange
    const input = {
      id: "abc-123",
      cep: "30130010",
      endereco: "Rua Exemplo, 100",
      bairro: "Centro",
      cidade: "BH",
      estado: "MG",
      lat: -19.92,
      lng: -43.93,
      emoji: "🔥",
      tipo: "Incêndio",
      detalhes: "Fogo no prédio",
      origem: "cep",
      nomeAutor: "João",
      emailAutor: "joao@email.com",
    };

    // Act
    const resultado = normalizeOcorrencia(input);

    // Assert
    expect(resultado).not.toBeNull();
    expect(resultado.tipo).toBe("Incêndio");
    expect(resultado.cep).toBe("30130-010");
    expect(resultado.lat).toBe(-19.92);
    expect(resultado.lng).toBe(-43.93);
  });

  // ── Sem lat/lng válidos deve retornar null ───────────────
  test("retorna null quando lat ou lng estão ausentes", () => {
    const input = {
      endereco: "Rua X", emoji: "🔥", tipo: "Fogo",
      lat: NaN, lng: -43.93
    };
    expect(normalizeOcorrencia(input)).toBeNull();
  });

  // ── Sem emoji deve retornar null ─────────────────────────
  test("retorna null quando emoji está ausente", () => {
    const input = {
      endereco: "Rua X", tipo: "Fogo",
      lat: -19.92, lng: -43.93, emoji: ""
    };
    expect(normalizeOcorrencia(input)).toBeNull();
  });

  // ── Sem tipo deve retornar null ──────────────────────────
  test("retorna null quando tipo está ausente", () => {
    const input = {
      endereco: "Rua X", emoji: "🔥", tipo: "",
      lat: -19.92, lng: -43.93
    };
    expect(normalizeOcorrencia(input)).toBeNull();
  });

  // ── Origem "mapa" sem endereço usa padrão ────────────────
  test("preenche endereço padrão para ocorrências de origem mapa", () => {
    const input = {
      emoji: "🔥", tipo: "Fogo",
      lat: -19.92, lng: -43.93,
      origem: "mapa"
      // endereco ausente propositalmente
    };
    const resultado = normalizeOcorrencia(input);
    expect(resultado).not.toBeNull();
    expect(resultado.endereco).toBe("Ponto selecionado no mapa");
  });

  // ── Entrada não-objeto deve retornar null ────────────────
  test("retorna null para entrada nula ou não-objeto", () => {
    expect(normalizeOcorrencia(null)).toBeNull();
    expect(normalizeOcorrencia("texto")).toBeNull();
    expect(normalizeOcorrencia(42)).toBeNull();
  });

  // ── Campos legados (localizacao, categoria) ──────────────
  test("aceita campos com nomes alternativos (localizacao, categoria)", () => {
    const input = {
      localizacao: "Av. Afonso Pena",  // alias de endereco
      categoria: "Roubo",              // alias de tipo
      emoji: "🚨",
      lat: -19.92, lng: -43.93
    };
    const resultado = normalizeOcorrencia(input);
    expect(resultado).not.toBeNull();
    expect(resultado.endereco).toBe("Av. Afonso Pena");
    expect(resultado.tipo).toBe("Roubo");
  });
});


// ════════════════════════════════════════════════════════════
//  BLOCO 3 — normalizeListaOcorrencias
//  Testa a lista como um todo (deduplicação, filtragem)
// ════════════════════════════════════════════════════════════

describe("normalizeListaOcorrencias", () => {

  const ocorrenciaValida = (id = "id-1") => ({
    id,
    endereco: "Rua Teste",
    emoji: "🔥",
    tipo: "Incêndio",
    lat: -19.92,
    lng: -43.93,
    origem: "cep"
  });

  // ── Lista vazia deve retornar array vazio ────────────────
  test("retorna array vazio para lista vazia", () => {
    expect(normalizeListaOcorrencias([])).toEqual([]);
  });

  // ── Entrada não-array deve retornar array vazio ──────────
  test("retorna array vazio para entrada não-array", () => {
    expect(normalizeListaOcorrencias(null)).toEqual([]);
    expect(normalizeListaOcorrencias("string")).toEqual([]);
  });

  // ── Remove ocorrências inválidas da lista ────────────────
  test("filtra ocorrências inválidas da lista", () => {
    const lista = [ocorrenciaValida("id-1"), { invalido: true }, null];
    const resultado = normalizeListaOcorrencias(lista);
    expect(resultado.length).toBe(1);
  });

  // ── Remove IDs duplicados ────────────────────────────────
  test("remove ocorrências com IDs duplicados", () => {
    const lista = [
      ocorrenciaValida("id-1"),
      ocorrenciaValida("id-1"),  // duplicata
      ocorrenciaValida("id-2")
    ];
    const resultado = normalizeListaOcorrencias(lista);
    expect(resultado.length).toBe(2);
  });
});


// ════════════════════════════════════════════════════════════
//  BLOCO 4 — getListaUser / saveListaUser
//  Testa leitura e escrita de usuários no localStorage
// ════════════════════════════════════════════════════════════

describe("getListaUser / saveListaUser", () => {

  beforeEach(() => {
    // Limpa o localStorage antes de cada teste
    localStorage.clear();
  });

  // ── Lista vazia retorna array vazio ──────────────────────
  test("retorna array vazio quando não há usuários", () => {
    expect(getListaUser()).toEqual([]);
  });

  // ── Salvar e recuperar usuário ───────────────────────────
  test("salva e recupera usuário corretamente", () => {
    // Arrange
    const usuario = { nomeUser: "Ana", emailUser: "ana@test.com", senhaUser: "123456" };

    // Act
    saveListaUser([usuario]);
    const resultado = getListaUser();

    // Assert
    expect(resultado.length).toBe(1);
    expect(resultado[0].emailUser).toBe("ana@test.com");
  });

  // ── Salvar múltiplos usuários ────────────────────────────
  test("persiste múltiplos usuários", () => {
    const usuarios = [
      { nomeUser: "Ana", emailUser: "ana@test.com" },
      { nomeUser: "Bruno", emailUser: "bruno@test.com" }
    ];
    saveListaUser(usuarios);
    expect(getListaUser().length).toBe(2);
  });
});


// ════════════════════════════════════════════════════════════
//  BLOCO 5 — setUserLogado / getUserLogado / logout / isAuthenticated
//  Testa o fluxo de autenticação
// ════════════════════════════════════════════════════════════

describe("Autenticação (setUserLogado / getUserLogado / logout / isAuthenticated)", () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // ── Sem login, isAuthenticated deve ser false ────────────
  test("isAuthenticated retorna false quando não logado", () => {
    expect(isAuthenticated()).toBe(false);
  });

  // ── Após login, isAuthenticated deve ser true ────────────
  test("isAuthenticated retorna true após login", () => {
    const user = { nomeUser: "Carlos", emailUser: "carlos@test.com" };
    setUserLogado(user);
    expect(isAuthenticated()).toBe(true);
  });

  // ── getUserLogado retorna o usuário correto ──────────────
  test("getUserLogado retorna o usuário logado", () => {
    const user = { nomeUser: "Daniela", emailUser: "dani@test.com" };
    setUserLogado(user);
    const resultado = getUserLogado();
    expect(resultado.emailUser).toBe("dani@test.com");
  });

  // ── Após logout, não deve estar autenticado ──────────────
  test("logout remove sessão corretamente", () => {
    setUserLogado({ nomeUser: "Eva" });
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(getUserLogado()).toBeNull();
  });

  // ── setUserLogado gera token no localStorage ─────────────
  test("setUserLogado armazena um token no localStorage", () => {
    setUserLogado({ nomeUser: "Felipe" });
    expect(localStorage.getItem("token")).not.toBeNull();
    expect(localStorage.getItem("token").length).toBeGreaterThan(0);
  });
});


// ════════════════════════════════════════════════════════════
//  BLOCO 6 — getListaOcorrencias / saveListaOcorrencias
//  Testa persistência de ocorrências
// ════════════════════════════════════════════════════════════

describe("getListaOcorrencias / saveListaOcorrencias", () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // ── Lista vazia retorna array vazio ──────────────────────
  test("retorna array vazio quando não há ocorrências", () => {
    expect(getListaOcorrencias()).toEqual([]);
  });

  // ── Salva e recupera ocorrência válida ───────────────────
  test("salva e recupera ocorrência válida", () => {
    const ocorrencia = {
      id: "oc-001",
      endereco: "Av. Principal, 1",
      emoji: "🚨",
      tipo: "Roubo",
      lat: -19.92,
      lng: -43.93,
      origem: "cep"
    };
    saveListaOcorrencias([ocorrencia]);
    const resultado = getListaOcorrencias();
    expect(resultado.length).toBe(1);
    expect(resultado[0].tipo).toBe("Roubo");
  });

  // ── Ocorrências inválidas são descartadas ao salvar ──────
  test("descarta ocorrências inválidas ao salvar", () => {
    const lista = [
      { id: "oc-001", endereco: "Rua X", emoji: "🔥", tipo: "Fogo", lat: -19.92, lng: -43.93 },
      { invalido: true }
    ];
    saveListaOcorrencias(lista);
    expect(getListaOcorrencias().length).toBe(1);
  });
});
(function seedUsers() {
  const lista = JSON.parse(localStorage.getItem("listaUser") || "[]");

  if (lista.length > 0) {
    return;
  }

  const users = [
    {
      nomeUser: "Joao Silva",
      emailUser: "joao@email.com",
      telefoneUser: "31987654321",
      bairroUser: "Lagoa Seca",
      enderecoUser: "Rua Um, 100",
      senhaUser: "123456",
      dataCadastro: new Date().toISOString()
    },
    {
      nomeUser: "Maria Santos",
      emailUser: "maria@email.com",
      telefoneUser: "31999887766",
      bairroUser: "Belvedere",
      enderecoUser: "Rua Dois, 250",
      senhaUser: "123456",
      dataCadastro: new Date().toISOString()
    }
  ];

  localStorage.setItem("listaUser", JSON.stringify(users));
})();

function getListaUser() {
  return JSON.parse(localStorage.getItem("listaUser") || "[]");
}

function saveListaUser(lista) {
  localStorage.setItem("listaUser", JSON.stringify(lista));
}

function getListaOcorrencias() {
  return normalizeListaOcorrencias(JSON.parse(localStorage.getItem("ocorrencias") || "[]"));
}

function saveListaOcorrencias(lista) {
  const normalizada = normalizeListaOcorrencias(lista);
  localStorage.setItem("ocorrencias", JSON.stringify(normalizada));
  return normalizada;
}

function normalizeListaOcorrencias(lista) {
  if (!Array.isArray(lista)) {
    return [];
  }

  const seen = new Set();

  return lista
    .map(normalizeOcorrencia)
    .filter(function (item) {
      if (!item || seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
}

function normalizeOcorrencia(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const cep = normalizeCep(item.cep || item.codigoPostal || "");
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  let endereco = String(item.endereco || item.localizacao || "").trim();
  const emoji = String(item.emoji || "").trim();
  const tipo = String(item.tipo || item.categoria || "").trim();

  // Permite endereço padrão para ocorrências criadas por clique no mapa
  if (!endereco && item.origem === "mapa") {
    endereco = "Ponto selecionado no mapa";
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !emoji || !tipo || !endereco) {
    return null;
  }

  return {
    id: String(item.id || createUniqueId()),
    cep: cep,
    endereco: endereco,
    bairro: String(item.bairro || item.cidade || "").trim(),
    cidade: String(item.cidade || "").trim(),
    estado: String(item.estado || "").trim(),
    lat: lat,
    lng: lng,
    emoji: emoji,
    tipo: tipo,
    detalhes: String(item.detalhes || item.descricao || "").trim(),
    origem: String(item.origem || "cep").trim(),
    nomeAutor: String(item.nomeAutor || "morador").trim(),
    emailAutor: String(item.emailAutor || "").trim(),
    criadoEm: item.criadoEm || new Date().toISOString()
  };
}

function normalizeCep(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);

  if (digits.length !== 8) {
    return "";
  }

  return digits.slice(0, 5) + "-" + digits.slice(5);
}

function createUniqueId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "oc_" + Date.now().toString(36) + "_" + Math.random().toString(16).slice(2);
}

function setUserLogado(user) {
  localStorage.setItem("userLogado", JSON.stringify(user));
  const token = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  localStorage.setItem("token", token);
}

function getUserLogado() {
  return JSON.parse(localStorage.getItem("userLogado") || "null");
}

function logout() {
  localStorage.removeItem("userLogado");
  localStorage.removeItem("token");
}

function isAuthenticated() {
  return Boolean(localStorage.getItem("token") && getUserLogado());
}

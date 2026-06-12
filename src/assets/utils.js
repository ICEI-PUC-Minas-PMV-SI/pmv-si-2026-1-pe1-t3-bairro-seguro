// ── Seed inicial de usuários ───────────────────────────────────────────────
(function seedUsers() {
  const lista = JSON.parse(localStorage.getItem("listaUser") || "[]");
  if (lista.length > 0) return;
  localStorage.setItem("listaUser", JSON.stringify([
    { nomeUser:"Joao Silva",   emailUser:"joao@email.com",  telefoneUser:"31987654321",
      bairroUser:"Lagoa Seca", enderecoUser:"Rua Um, 100",  senhaUser:"123456",
      role:"moderador", banido:false, fotoPerfilUser:"",
      perguntaSecreta:"nome_mae", respostaSecreta:"maria",
      dataCadastro: new Date().toISOString() },
    { nomeUser:"Maria Santos", emailUser:"maria@email.com", telefoneUser:"31999887766",
      bairroUser:"Belvedere",  enderecoUser:"Rua Dois, 250", senhaUser:"123456",
      role:"morador", banido:false, fotoPerfilUser:"",
      perguntaSecreta:"nome_mae", respostaSecreta:"ana",
      dataCadastro: new Date().toISOString() }
  ]));
})();

// ── Usuários ───────────────────────────────────────────────────────────────
function getListaUser()         { return JSON.parse(localStorage.getItem("listaUser") || "[]"); }
function saveListaUser(lista)   { localStorage.setItem("listaUser", JSON.stringify(lista)); }

// ── Ocorrências ────────────────────────────────────────────────────────────
function getListaOcorrencias()  { return normalizeListaOcorrencias(JSON.parse(localStorage.getItem("ocorrencias") || "[]")); }
function saveListaOcorrencias(lista) {
  const norm = normalizeListaOcorrencias(lista);
  localStorage.setItem("ocorrencias", JSON.stringify(norm));
  return norm;
}
function normalizeListaOcorrencias(lista) {
  if (!Array.isArray(lista)) return [];
  const seen = new Set();
  return lista.map(normalizeOcorrencia).filter(function(o) {
    if (!o || seen.has(o.id)) return false;
    seen.add(o.id); return true;
  });
}
function normalizeOcorrencia(item) {
  if (!item || typeof item !== "object") return null;
  const lat = Number(item.lat), lng = Number(item.lng);
  let endereco = String(item.endereco || item.localizacao || "").trim();
  const emoji  = String(item.emoji  || "").trim();
  const tipo   = String(item.tipo   || item.categoria || "").trim();
  if (!endereco && item.origem === "mapa") endereco = "Ponto selecionado no mapa";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !emoji || !tipo || !endereco) return null;
  return {
    id: String(item.id || createUniqueId()),
    cep: normalizeCep(item.cep || ""),
    endereco, bairro: String(item.bairro || "").trim(),
    cidade: String(item.cidade || "").trim(), estado: String(item.estado || "").trim(),
    lat, lng, emoji, tipo,
    detalhes:   String(item.detalhes  || "").trim(),
    gravidade:  String(item.gravidade || "atencao").trim(),
    midias:     Array.isArray(item.midias)     ? item.midias     : [],
    comentarios:Array.isArray(item.comentarios)? item.comentarios: [],
    denuncias:  Array.isArray(item.denuncias)  ? item.denuncias  : [],
    origem:     String(item.origem    || "cep").trim(),
    nomeAutor:  String(item.nomeAutor || "morador").trim(),
    emailAutor: String(item.emailAutor|| "").trim(),
    criadoEm:   item.criadoEm  || new Date().toISOString(),
    editadoEm:  item.editadoEm || null
  };
}

// ── Comentários ────────────────────────────────────────────────────────────
function adicionarComentario(ocId, texto, autor) {
  const lista = getListaOcorrencias();
  const idx = lista.findIndex(function(o){ return o.id === ocId; });
  if (idx === -1) return false;
  lista[idx].comentarios.push({ id:createUniqueId(), texto:String(texto).trim(),
    nomeAutor:autor.nomeUser||"morador", emailAutor:autor.emailUser||"",
    criadoEm:new Date().toISOString() });
  saveListaOcorrencias(lista); return true;
}
function removerComentario(ocId, comId) {
  const lista = getListaOcorrencias();
  const idx = lista.findIndex(function(o){ return o.id === ocId; });
  if (idx === -1) return false;
  const u = getUserLogado();
  lista[idx].comentarios = lista[idx].comentarios.filter(function(c){
    if (c.id !== comId) return true;
    return !(c.emailAutor === (u&&u.emailUser) || isModerador());
  });
  saveListaOcorrencias(lista); return true;
}

// ── Denúncias ──────────────────────────────────────────────────────────────
function denunciarOcorrencia(ocId, motivo, emailDen) {
  const lista = getListaOcorrencias();
  const idx = lista.findIndex(function(o){ return o.id === ocId; });
  if (idx === -1) return false;
  if (lista[idx].denuncias.some(function(d){ return d.emailDenunciante === emailDen; })) return "ja";
  lista[idx].denuncias.push({ id:createUniqueId(), motivo:String(motivo).trim(),
    emailDenunciante:emailDen, criadoEm:new Date().toISOString() });
  saveListaOcorrencias(lista);
  registrarLog("denuncia", { ocId, motivo, por:emailDen });
  return true;
}

// ── Logs ───────────────────────────────────────────────────────────────────
function registrarLog(acao, dados) {
  const logs = JSON.parse(localStorage.getItem("logsModeracao") || "[]");
  logs.unshift({ id:createUniqueId(), acao, dados, criadoEm:new Date().toISOString() });
  localStorage.setItem("logsModeracao", JSON.stringify(logs.slice(0,200)));
}
function getLogsModeracao() { return JSON.parse(localStorage.getItem("logsModeracao") || "[]"); }

// ── Banimento ──────────────────────────────────────────────────────────────
function banirUsuario(email, horas, motivo, modEmail) {
  const lista = getListaUser();
  const idx = lista.findIndex(function(u){ return u.emailUser === email; });
  if (idx === -1) return false;
  const ate = horas > 0 ? new Date(Date.now()+horas*3600000).toISOString() : null;
  Object.assign(lista[idx], { banido:true, banidoAte:ate, motivoBanimento:motivo });
  saveListaUser(lista);
  registrarLog("banimento", { email, horas, motivo, por:modEmail, ate });
  return true;
}
function desbanirUsuario(email, modEmail) {
  const lista = getListaUser();
  const idx = lista.findIndex(function(u){ return u.emailUser === email; });
  if (idx === -1) return false;
  Object.assign(lista[idx], { banido:false, banidoAte:null, motivoBanimento:null });
  saveListaUser(lista);
  registrarLog("desbanimento", { email, por:modEmail });
  return true;
}
function verificarBanimento(user) {
  if (!user || !user.banido) return false;
  if (!user.banidoAte) return true;
  if (new Date(user.banidoAte) < new Date()) {
    const lista = getListaUser();
    const idx = lista.findIndex(function(u){ return u.emailUser === user.emailUser; });
    if (idx !== -1) { lista[idx].banido=false; lista[idx].banidoAte=null; saveListaUser(lista); }
    return false;
  }
  return true;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function normalizeCep(value) {
  const d = String(value||"").replace(/\D/g,"").slice(0,8);
  return d.length===8 ? d.slice(0,5)+"-"+d.slice(5) : "";
}
function createUniqueId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID==="function") return globalThis.crypto.randomUUID();
  return "id_"+Date.now().toString(36)+"_"+Math.random().toString(16).slice(2);
}
function setUserLogado(user) {
  localStorage.setItem("userLogado", JSON.stringify(user));
  localStorage.setItem("token", Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2));
}
function getUserLogado()    { return JSON.parse(localStorage.getItem("userLogado")||"null"); }
function logout()           { localStorage.removeItem("userLogado"); localStorage.removeItem("token"); }
function isAuthenticated()  { return Boolean(localStorage.getItem("token") && getUserLogado()); }
function isModerador()      { const u=getUserLogado(); return u && u.role==="moderador"; }

// ── Configurações ──────────────────────────────────────────────────────────
function getConfiguracoes() {
  try { return Object.assign({tema:"escuro",notificacoes:true}, JSON.parse(localStorage.getItem("configuracoes")||"{}")); }
  catch(_) { return {tema:"escuro",notificacoes:true}; }
}
function saveConfiguracoes(c) { localStorage.setItem("configuracoes", JSON.stringify(c)); }

(function aplicarTema(){
  if (getConfiguracoes().tema==="claro") document.documentElement.setAttribute("data-tema","claro");
  else document.documentElement.removeAttribute("data-tema");
})();

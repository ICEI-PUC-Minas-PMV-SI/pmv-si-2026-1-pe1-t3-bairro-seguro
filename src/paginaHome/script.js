(function initHome() {
  if (!isAuthenticated()) { location.href = "../pagina-login/login.html"; return; }
  const user = getUserLogado();
  if (verificarBanimento(user)) { logout(); location.href = "../pagina-login/login.html?banido=1"; return; }

  // ── refs ──────────────────────────────────────────────────────────────────
  const $ = function(id) { return document.getElementById(id); };
  const boasVindas   = $("boasVindas");
  const buscaInput   = $("buscaBairro");
  const filtroGrav   = $("filtroGravidade");
  const listaEl      = $("listaOcorrencias");
  const cepInput     = $("cepInput");
  const buscarCepBtn = $("buscarCepBtn");
  const locSel       = $("locSelecionado");
  const locTexto     = $("locTexto");
  const emojiSel     = $("emojiSelect");
  const gravSel      = $("gravidadeSelect");
  const detalheIn    = $("detalheInput");
  const midiaInput   = $("midiaInput");
  const midiaPreview = $("midiaPreview");
  const uploadArea   = $("uploadArea");
  const relatarBtn   = $("relatarBtn");
  const limparBtn    = $("limparBtn");
  const emergenciaBtn= $("emergenciaBtn");
  const fbBusca      = $("feedbackBusca");
  const fbRelato     = $("feedbackRelato");
  const editModal    = $("editModal");
  const editForm     = $("editForm");
  const denModal     = $("denModal");
  const denForm      = $("denForm");

  if (boasVindas) boasVindas.textContent = "Olá, " + (user.nomeUser || "morador");

  // ── estado ────────────────────────────────────────────────────────────────
  let selLoc = null;
  let selMark = null;
  let midiaFiles = [];
  let modoEmergencia = false;
  let ocorrencias = carregarPersistidas();

  // ── mapa ──────────────────────────────────────────────────────────────────
  // Forçar altura explícita antes do Leaflet inicializar
  const mapEl = document.getElementById("map");
  mapEl.style.width  = "100%";
  mapEl.style.height = "460px";

  const mapa = L.map("map", {
    zoomControl: true,
    preferCanvas: false
  }).setView([-14.235, -51.9253], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  const markersLayer = L.layerGroup().addTo(mapa);
  const selLayer     = L.layerGroup().addTo(mapa);
  const markerById   = new Map();

  renderAll();

  // Chamar invalidateSize em múltiplos momentos para garantir
  // que o Leaflet recalcule após a sidebar terminar de renderizar
  mapa.invalidateSize();
  setTimeout(function () { mapa.invalidateSize(); }, 100);
  setTimeout(function () { mapa.invalidateSize(); }, 500);
  window.addEventListener("load", function () { mapa.invalidateSize(); });

  // ── listeners ─────────────────────────────────────────────────────────────
  buscaInput.addEventListener("input", renderAll);
  filtroGrav.addEventListener("change", renderAll);
  buscarCepBtn.addEventListener("click", buscarCep);
  relatarBtn.addEventListener("click", salvarOcorrencia);
  limparBtn.addEventListener("click", limparSel);
  emergenciaBtn.addEventListener("click", ativarEmergencia);

  cepInput.addEventListener("input", function (e) {
    e.target.value = fmtCep(e.target.value);
  });
  cepInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); buscarCep(); }
  });

  // upload de mídia
  uploadArea.addEventListener("dragover", function (e) {
    e.preventDefault(); uploadArea.classList.add("drag-over");
  });
  uploadArea.addEventListener("dragleave", function () {
    uploadArea.classList.remove("drag-over");
  });
  uploadArea.addEventListener("drop", function (e) {
    e.preventDefault(); uploadArea.classList.remove("drag-over");
    addMidias(Array.from(e.dataTransfer.files));
  });
  midiaInput.addEventListener("change", function () {
    addMidias(Array.from(midiaInput.files));
  });

  function addMidias(files) {
    midiaFiles = midiaFiles
      .concat(files.filter(function (f) { return f.type.startsWith("image/") || f.type.startsWith("video/"); }))
      .slice(0, 5);
    renderMidias();
  }

  function renderMidias() {
    midiaPreview.innerHTML = "";
    midiaFiles.forEach(function (f, i) {
      const d = document.createElement("div"); d.className = "midia-item";
      if (f.type.startsWith("image/")) {
        const img = document.createElement("img"); img.src = URL.createObjectURL(f); d.appendChild(img);
      } else {
        d.innerHTML = '<div class="midia-vid">🎬</div>';
      }
      const btn = document.createElement("button"); btn.className = "midia-rm"; btn.textContent = "✕";
      btn.onclick = function () { midiaFiles.splice(i, 1); renderMidias(); };
      d.appendChild(btn); midiaPreview.appendChild(d);
    });
  }

  // ── clique no mapa → geocodificação reversa ────────────────────────────────
  mapa.on("click", async function (ev) {
    const lat = ev.latlng.lat, lng = ev.latlng.lng;

    // pin imediato
    colocarPin({ origem: "mapa", cep: "", endereco: "Buscando endereço...", bairro: "", cidade: "", estado: "", lat, lng });
    setLocInfo("⏳ Identificando endereço...", false);
    cepInput.value = "";
    setFbBusca("Aguarde, identificando o endereço do ponto...", "");

    try {
      const r = await fetch(
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng + "&addressdetails=1&accept-language=pt-BR",
        { headers: { Accept: "application/json" } }
      );
      if (!r.ok) throw new Error("nominatim falhou");
      const d = await r.json(), a = d.address || {};

      const pc      = a.postcode ? a.postcode.replace(/\D/g, "") : "";
      const cepFmt  = pc.length === 8 ? pc.slice(0, 5) + "-" + pc.slice(5) : "";
      const rua     = a.road || a.pedestrian || a.footway || "";
      const bairro  = a.suburb || a.neighbourhood || a.city_district || "";
      const cidade  = a.city || a.town || a.village || a.municipality || "";
      const estado  = a.state_code || a.state || "";
      const end     = [rua, bairro, cidade, estado].filter(Boolean).join(", ") || d.display_name || "Ponto selecionado";

      selLoc = { origem: "mapa", cep: cepFmt, endereco: end, bairro, cidade, estado, lat, lng };
      if (cepFmt) cepInput.value = cepFmt;
      setLocInfo("📍 " + (cepFmt ? "CEP " + cepFmt + " · " : "") + end, true);
      setFbBusca("✅ Local selecionado! Preencha o tipo e clique em Relatar.", "success");
    } catch (_) {
      selLoc = { origem: "mapa", cep: "", endereco: "Ponto selecionado no mapa", bairro: "", cidade: "", estado: "", lat, lng };
      setLocInfo("📍 Ponto selecionado no mapa", true);
      setFbBusca("Endereço não identificado, mas você pode relatar normalmente.", "error");
    }
  });

  window.addEventListener("storage", function (e) {
    if (e.key === "ocorrencias") { ocorrencias = carregarPersistidas(); renderAll(); }
  });

  // ── render ────────────────────────────────────────────────────────────────
  function renderAll() {
    const termo = buscaInput.value.trim().toLowerCase();
    const grav  = filtroGrav.value;
    let lista = ocorrencias.slice().sort(function (a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
    if (termo) lista = lista.filter(function (o) {
      return [o.cep, o.endereco, o.bairro, o.tipo, o.detalhes].join(" ").toLowerCase().includes(termo);
    });
    if (grav) lista = lista.filter(function (o) { return o.gravidade === grav; });
    renderLista(lista);
    renderMarcadores(lista);
  }

  const GRAV_LBL = { perigo_extremo: "🔴 Perigo extremo", perigo: "🟠 Perigo", atencao: "🟡 Atenção" };
  const GRAV_CLS = { perigo_extremo: "gv-ext", perigo: "gv-per", atencao: "gv-ate" };

  function renderLista(lista) {
    if (!lista.length) {
      listaEl.innerHTML = '<li class="empty-msg">Nenhuma ocorrência encontrada.</li>';
      return;
    }
    listaEl.innerHTML = lista.map(function (o) {
      const isAuthor = o.emailAutor && user.emailUser && o.emailAutor === user.emailUser;
      const cepLbl   = o.cep ? "CEP " + esc(o.cep) : "CEP não informado";
      const gravCls  = GRAV_CLS[o.gravidade] || "gv-ate";
      const gravLbl  = GRAV_LBL[o.gravidade] || "🟡 Atenção";
      const denCnt   = o.denuncias.length;
      const comCnt   = o.comentarios.length;
      const autBtns  = (isAuthor || isModerador())
        ? '<button class="btn-card btn-edit" data-id="' + o.id + '">Editar</button>'
          + '<button class="btn-card btn-del" data-id="' + o.id + '">Remover</button>' : "";
      const denBtn   = !isAuthor
        ? '<button class="btn-card btn-den" data-id="' + o.id + '" title="Denunciar">⚑</button>' : "";
      return (
        '<li class="ocard' + (o.emergencia ? " ocard-emergencia" : "") + '" data-id="' + o.id + '">'
          + '<div class="card-top">'
            + (o.emergencia ? '<span class="emerg-tag">🆘 EMERGÊNCIA</span>' : "")
            + '<span class="card-emoji">' + esc(o.emoji) + '</span>'
            + '<span class="card-cat">'   + esc(o.tipo)  + '</span>'
            + '<span class="badge grav ' + gravCls + '">' + gravLbl + '</span>'
            + '<span class="badge cep">' + cepLbl + '</span>'
            + (denCnt >= 3 ? '<span class="badge-den">⚑' + denCnt + '</span>' : "")
          + '</div>'
          + '<div class="card-loc">📍 ' + esc(o.endereco) + '</div>'
          + (o.detalhes ? '<div class="card-desc">' + esc(o.detalhes) + '</div>' : "")
          + (o.midias.length ? '<div class="card-mid">📷 ' + o.midias.length + ' mídia(s)</div>' : "")
          + '<div class="card-foot">'
            + '<span>🕒 ' + esc(fmtData(o.criadoEm)) + '</span>'
            + (o.editadoEm ? '<span class="tag-edit">editado</span>' : "")
            + '<div class="card-acts">'
              + '<button class="btn-card btn-com" data-id="' + o.id + '">💬 ' + comCnt + '</button>'
              + denBtn + autBtns
            + '</div>'
          + '</div>'
          + '<div class="com-area" id="com-' + o.id + '" style="display:none"></div>'
        + '</li>'
      );
    }).join("");

    listaEl.querySelectorAll(".ocard").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest(".btn-card") || e.target.closest(".com-area")) return;
        const m = markerById.get(card.dataset.id);
        if (m) { mapa.flyTo([m.lat, m.lng], 16); m.marker.openPopup(); }
      });
    });
    listaEl.querySelectorAll(".btn-del").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); removerOc(b.dataset.id); }); });
    listaEl.querySelectorAll(".btn-edit").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); abrirEdit(b.dataset.id); }); });
    listaEl.querySelectorAll(".btn-com").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); toggleCom(b.dataset.id); }); });
    listaEl.querySelectorAll(".btn-den").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); abrirDen(b.dataset.id); }); });
  }

  function renderMarcadores(lista) {
    markersLayer.clearLayers(); markerById.clear();
    lista.forEach(function (o) {
      const pulse = o.gravidade === "perigo_extremo" ? " pulse" : "";
      const icon = L.divIcon({ html: '<div class="map-icon' + pulse + '">' + esc(o.emoji) + '</div>', className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
      const m = L.marker([o.lat, o.lng], { icon }).bindPopup(
        '<div class="popup"><strong>' + esc(o.emoji + " " + o.tipo) + '</strong><br>'
        + esc(o.endereco) + '<br>'
        + (o.cep ? "CEP " + esc(o.cep) + "<br>" : "")
        + (GRAV_LBL[o.gravidade] || "")
        + (o.detalhes ? "<br><em>" + esc(o.detalhes) + "</em>" : "")
        + '</div>'
      );
      m.addTo(markersLayer);
      markerById.set(o.id, { marker: m, lat: o.lat, lng: o.lng });
    });
  }

  // ── comentários ────────────────────────────────────────────────────────────
  function toggleCom(id) {
    const area = document.getElementById("com-" + id);
    if (!area) return;
    if (area.style.display !== "none") { area.style.display = "none"; return; }
    renderComArea(id, area);
    area.style.display = "block";
  }

  function renderComArea(id, area) {
    const oc = getListaOcorrencias().find(function (o) { return o.id === id; });
    if (!oc) return;
    const coms = oc.comentarios || [];
    area.innerHTML =
      '<div class="coms-lista">'
      + (coms.length ? coms.map(function (c) {
          const del = (c.emailAutor === user.emailUser || isModerador())
            ? '<button class="com-del" data-oc="' + id + '" data-c="' + c.id + '">✕</button>' : "";
          return '<div class="com-item"><div class="com-autor">' + esc(c.nomeAutor)
            + ' <span>' + esc(fmtData(c.criadoEm)) + '</span></div>'
            + '<div class="com-txt">' + esc(c.texto) + '</div>' + del + '</div>';
        }).join("") : '<p class="com-vazio">Nenhum comentário ainda.</p>')
      + '</div>'
      + '<div class="com-form"><textarea id="ct-' + id + '" placeholder="Comentar... (mín. 3 chars)" rows="2"></textarea>'
      + '<button class="com-send" data-id="' + id + '">Enviar</button></div>';

    area.querySelectorAll(".com-del").forEach(function (b) {
      b.addEventListener("click", function () {
        removerComentario(b.dataset.oc, b.dataset.c);
        ocorrencias = carregarPersistidas(); renderAll(); renderComArea(id, area);
      });
    });
    area.querySelector(".com-send").addEventListener("click", function () {
      const ta = document.getElementById("ct-" + id);
      const txt = ta ? ta.value.trim() : "";
      if (txt.length < 3) { alert("Mínimo 3 caracteres."); return; }
      adicionarComentario(id, txt, user);
      ocorrencias = carregarPersistidas(); renderAll(); renderComArea(id, area);
    });
  }

  // ── denúncia ───────────────────────────────────────────────────────────────
  function abrirDen(id) { $("denId").value = id; denModal.classList.add("vis"); }
  $("denClose").addEventListener("click",  function () { denModal.classList.remove("vis"); });
  $("denCancel").addEventListener("click", function () { denModal.classList.remove("vis"); });
  denModal.addEventListener("click", function (e) { if (e.target === denModal) denModal.classList.remove("vis"); });
  denForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const mot = $("denMotivo").value;
    if (!mot) { alert("Selecione o motivo."); return; }
    const res = denunciarOcorrencia($("denId").value, mot, user.emailUser);
    if (res === "ja") alert("Você já denunciou esta ocorrência.");
    else setFbRelato("Denúncia registrada. Obrigado!", "success");
    denModal.classList.remove("vis");
  });

  // ── busca CEP ──────────────────────────────────────────────────────────────
  async function buscarCep() {
    const cep = normalizeCep(cepInput.value);
    if (!cep) { setFbBusca("Digite um CEP válido no formato XXXXX-XXX.", "error"); return; }
    buscarCepBtn.disabled = true;
    setFbBusca("Buscando endereço do CEP " + cep + "...", "");
    try {
      const vr = await fetch("https://viacep.com.br/ws/" + cep.replace(/\D/g, "") + "/json/");
      if (!vr.ok) throw new Error("viacep falhou");
      const vd = await vr.json();
      if (vd.erro) { setFbBusca("CEP " + cep + " não encontrado. Verifique e tente novamente.", "error"); return; }

      const cidade = vd.localidade || "", estado = vd.uf || "", bairro = vd.bairro || "", log = vd.logradouro || "";
      const end = [log, bairro, cidade, estado].filter(Boolean).join(", ");

      let geo = await fetchGeo("postalcode=" + cep.replace(/\D/g, "") + "&countrycodes=br");
      if (!geo.length && cidade) geo = await fetchGeo("city=" + encodeURIComponent(cidade) + "&state=" + encodeURIComponent(estado) + "&country=br");
      if (!geo.length) geo = await fetchGeo("q=" + encodeURIComponent((log || cidade) + ", " + estado + ", Brasil"));
      if (!geo.length) { setFbBusca("CEP encontrado mas não localizou no mapa. Tente clicar no mapa.", "error"); return; }

      const pt = geo[0];
      colocarPin({ origem: "cep", cep, endereco: end, bairro, cidade, estado, lat: +pt.lat, lng: +pt.lon });
      setLocInfo("📍 CEP " + cep + " · " + end, true);
      setFbBusca("✅ CEP localizado! Preencha o tipo e clique em Relatar.", "success");
    } catch (_) {
      setFbBusca("Erro ao consultar o CEP. Verifique a conexão e tente novamente.", "error");
    } finally {
      buscarCepBtn.disabled = false;
    }
  }

  async function fetchGeo(params) {
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&" + params, { headers: { Accept: "application/json" } });
    if (!r.ok) return [];
    return await r.json();
  }

  // ── salvar ocorrência ──────────────────────────────────────────────────────
  // ── emergência ─────────────────────────────────────────────────────────────
  function ativarEmergencia() {
    modoEmergencia = true;

    // Pré-preencher formulário com padrões de emergência
    emojiSel.value  = "🚨";
    gravSel.value   = "perigo_extremo";

    // Destacar o formulário visualmente
    const formOc = document.querySelector(".form-occurrence");
    if (formOc) formOc.classList.add("modo-emergencia");

    // Alterar o botão Relatar para indicar emergência
    relatarBtn.textContent = "🆘 Relatar EMERGÊNCIA";
    relatarBtn.style.background = "linear-gradient(135deg,#9b1c1c,#dc2626)";

    // Scroll até o formulário
    document.querySelector(".actions").scrollIntoView({ behavior: "smooth", block: "start" });

    setFbRelato("🆘 Modo emergência ativado! Selecione o local e clique em Relatar EMERGÊNCIA.", "error");
  }

  function salvarOcorrencia() {
    if (!selLoc) {
      setFbRelato("⚠️ Selecione o local primeiro: clique no mapa ou busque um CEP.", "error");
      return;
    }
    const emoji = emojiSel.value.trim();
    if (!emoji) { setFbRelato("⚠️ Selecione o tipo da ocorrência.", "error"); return; }

    const det = detalheIn.value.trim();
    if (det.length > 0 && det.length < 20) {
      setFbRelato("⚠️ A descrição precisa ter pelo menos 20 caracteres (ou deixe o campo vazio).", "error");
      return;
    }

    const nova = {
      id: createUniqueId(),
      cep: selLoc.cep || "",
      endereco: selLoc.endereco,
      bairro: selLoc.bairro || "",
      cidade: selLoc.cidade || "",
      estado: selLoc.estado || "",
      lat: +selLoc.lat,
      lng: +selLoc.lng,
      emoji,
      tipo: modoEmergencia ? "EMERGÊNCIA" : tipoDeEmoji(emoji),
      detalhes: det,
      gravidade: modoEmergencia ? "perigo_extremo" : (gravSel.value || "atencao"),
      emergencia: modoEmergencia,
      midias: midiaFiles.map(function (f) { return { nome: f.name, tipo: f.type }; }),
      origem: selLoc.origem,
      nomeAutor: user.nomeUser || "morador",
      emailAutor: user.emailUser || "",
      criadoEm: new Date().toISOString(),
      editadoEm: null,
      comentarios: [],
      denuncias: []
    };

    ocorrencias = saveListaOcorrencias([].concat(getListaOcorrencias(), nova));
    renderAll();
    limparSel();
    midiaFiles = []; renderMidias();

    const msg = modoEmergencia
      ? "🆘 Emergência registrada no mapa!"
      : "✅ Ocorrência salva e exibida no mapa!";
    setFbRelato(msg, modoEmergencia ? "error" : "success");
  }

  function removerOc(id) {
    if (!confirm("Remover esta ocorrência?")) return;
    if (isModerador()) registrarLog("remocao_mod", { id, por: user.emailUser });
    ocorrencias = saveListaOcorrencias(getListaOcorrencias().filter(function (o) { return o.id !== id; }));
    renderAll(); setFbRelato("Ocorrência removida.", "success");
  }

  // ── edição (limite 1h para autor) ──────────────────────────────────────────
  function abrirEdit(id) {
    const o = getListaOcorrencias().find(function (x) { return x.id === id; });
    if (!o) return;
    if (!isModerador() && o.emailAutor === user.emailUser) {
      if ((Date.now() - new Date(o.criadoEm).getTime()) / 60000 > 60) {
        alert("Edição permitida somente até 1 hora após a publicação."); return;
      }
    }
    $("editId").value       = o.id;
    $("editEmoji").value    = o.emoji;
    $("editGravidade").value= o.gravidade || "atencao";
    $("editEndereco").value = o.endereco  || "";
    $("editDetalhe").value  = o.detalhes  || "";
    editModal.classList.add("vis");
  }

  function fecharEdit() { editModal.classList.remove("vis"); }
  $("editClose").addEventListener("click",  fecharEdit);
  $("editCancel").addEventListener("click", fecharEdit);
  editModal.addEventListener("click", function (e) { if (e.target === editModal) fecharEdit(); });

  editForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const id    = $("editId").value;
    const emoji = $("editEmoji").value.trim();
    if (!emoji) { alert("Selecione o tipo."); return; }
    const det = $("editDetalhe").value.trim();
    if (det.length > 0 && det.length < 20) { alert("Descrição: mínimo 20 caracteres ou deixe em branco."); return; }
    const lista = getListaOcorrencias();
    const idx   = lista.findIndex(function (o) { return o.id === id; });
    if (idx === -1) return;
    lista[idx] = Object.assign({}, lista[idx], {
      emoji,
      tipo:      tipoDeEmoji(emoji),
      gravidade: $("editGravidade").value,
      detalhes:  det,
      endereco:  $("editEndereco").value.trim() || lista[idx].endereco,
      editadoEm: new Date().toISOString()
    });
    ocorrencias = saveListaOcorrencias(lista);
    renderAll(); fecharEdit(); setFbRelato("Ocorrência atualizada.", "success");
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  function colocarPin(loc) {
    selLoc = loc;
    if (selMark) selLayer.removeLayer(selMark);
    selMark = L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({ html: '<div class="sel-pin">📌</div>', className: "", iconSize: [36, 36], iconAnchor: [18, 18] })
    }).addTo(selLayer);
    mapa.setView([loc.lat, loc.lng], 16);
  }

  function setLocInfo(txt, selecionado) {
    if (!locSel || !locTexto) return;
    locTexto.textContent = txt;
    locSel.className = "loc-box " + (selecionado ? "loc-selecionado" : "loc-vazio");
  }

  function limparSel() {
    selLoc = null;
    emojiSel.value  = "";
    gravSel.value   = "atencao";
    detalheIn.value = "";
    cepInput.value  = "";
    fbBusca.textContent = "";
    setLocInfo("📍 Nenhum local selecionado — clique no mapa ou busque um CEP abaixo", false);
    if (selMark) { selLayer.removeLayer(selMark); selMark = null; }

    // Resetar modo emergência
    if (modoEmergencia) {
      modoEmergencia = false;
      const formOc = document.querySelector(".form-occurrence");
      if (formOc) formOc.classList.remove("modo-emergencia");
      relatarBtn.textContent = "📌 Relatar no mapa";
      relatarBtn.style.background = "";
    }
  }

  function carregarPersistidas() {
    const raw  = JSON.parse(localStorage.getItem("ocorrencias") || "[]");
    const norm = normalizeListaOcorrencias(raw);
    if (norm.length !== raw.length) localStorage.setItem("ocorrencias", JSON.stringify(norm));
    return norm;
  }

  function fmtCep(v)  { const d = String(v || "").replace(/\D/g, "").slice(0, 8); return d.length <= 5 ? d : d.slice(0, 5) + "-" + d.slice(5); }
  function fmtData(iso) { const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  function tipoDeEmoji(e) { return { "🚨":"Assalto/roubo","💡":"Iluminação apagada","🔊":"Som alto/barulho","🚫":"Vandalismo/dano","⚠️":"Assédio","📍":"Outro problema" }[e] || "Ocorrência"; }
  function setFbBusca(t, k)  { fbBusca.textContent  = t; fbBusca.className  = "feedback" + (k ? " " + k : ""); }
  function setFbRelato(t, k) { fbRelato.textContent = t; fbRelato.className = "feedback" + (k ? " " + k : ""); }
  function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
})();
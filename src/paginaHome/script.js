(function initHome() {
  if (!isAuthenticated()) {
    globalThis.location.href = "../pagina-login/login.html";
    return;
  }

  const user = getUserLogado();
  const boasVindas     = document.getElementById("boasVindas");
  const buscaInput     = document.getElementById("buscaBairro");
  const listaEl        = document.getElementById("listaOcorrencias");
  const sairBtn        = document.getElementById("sairBtn");
  const cepInput       = document.getElementById("cepInput");
  const buscarCepBtn   = document.getElementById("buscarCepBtn");
  const enderecoBox    = document.getElementById("enderecoEncontrado");
  const enderecoTexto  = document.getElementById("enderecoTexto");
  const formOcorrencia = document.getElementById("formOcorrencia");
  const emojiSelect    = document.getElementById("emojiSelect");
  const detalheInput   = document.getElementById("detalheInput");
  const relatarBtn     = document.getElementById("relatarBtn");
  const limparBtn      = document.getElementById("limparBtn");
  const feedbackBusca  = document.getElementById("feedbackBusca");
  const feedbackRelato = document.getElementById("feedbackRelato");

  // ── Modal de edição ────────────────────────────────────────────────────────
  const editModal        = document.getElementById("editModal");
  const editModalClose   = document.getElementById("editModalClose");
  const editForm         = document.getElementById("editForm");
  const editEmoji        = document.getElementById("editEmoji");
  const editDetalhe      = document.getElementById("editDetalhe");
  const editEndereco     = document.getElementById("editEndereco");
  const editIdInput      = document.getElementById("editId");

  boasVindas.textContent = "Olá, " + (user?.nomeUser || "morador");

  // ── Mapa ───────────────────────────────────────────────────────────────────
  const mapa = L.map("map", { zoomControl: true }).setView([-14.235, -51.9253], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  const markersLayer  = L.layerGroup().addTo(mapa);
  const selectionLayer = L.layerGroup().addTo(mapa);
  const markerById    = new Map();

  let selectedLocation = null;
  let selectedMarker   = null;
  let ocorrencias      = carregarOcorrenciasPersistidas();

  renderAll();

  // ── Listeners ──────────────────────────────────────────────────────────────
  buscaInput.addEventListener("input", renderAll);

  cepInput.addEventListener("input", function (e) {
    e.target.value = formatCep(e.target.value);
  });
  cepInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); buscarCep(); }
  });

  buscarCepBtn.addEventListener("click", buscarCep);
  relatarBtn.addEventListener("click", salvarOcorrencia);
  limparBtn.addEventListener("click", function () { limparSelecao(false); });

  sairBtn.addEventListener("click", function () {
    logout();
    globalThis.location.href = "../pagina-login/login.html";
  });

  // ── Clique no mapa: geocodificação reversa ─────────────────────────────────
  mapa.on("click", async function (event) {
    const lat = event.latlng.lat;
    const lng = event.latlng.lng;

    // Coloca o pin imediatamente e abre o formulário
    selecionarLocal({
      origem: "mapa", cep: "", endereco: "Buscando endereço...",
      bairro: "", cidade: "", estado: "", lat: lat, lng: lng
    });
    mostrarEnderecoSelecionado("Buscando endereço...");
    abrirFormularioRelato();
    cepInput.value = "";
    showBuscaFeedback("Identificando endereço do ponto selecionado...", "");

    try {
      // Geocodificação reversa: coordenadas → endereço + CEP
      const reverseRes = await fetch(
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng + "&addressdetails=1&accept-language=pt-BR",
        { headers: { Accept: "application/json" } }
      );

      if (!reverseRes.ok) throw new Error("Falha na geocodificação reversa");
      const reverseData = await reverseRes.json();

      const addr        = reverseData.address || {};
      const postcode    = addr.postcode ? addr.postcode.replace(/\D/g, "") : "";
      const cepFormatado = postcode.length === 8
        ? postcode.slice(0, 5) + "-" + postcode.slice(5)
        : "";

      const logradouro = addr.road || addr.pedestrian || addr.footway || "";
      const bairro     = addr.suburb || addr.neighbourhood || addr.city_district || "";
      const cidade     = addr.city || addr.town || addr.village || addr.municipality || "";
      const estado     = addr.state_code || addr.state || "";
      const enderecoMontado = [logradouro, bairro, cidade, estado]
        .map(function (p) { return String(p || "").trim(); })
        .filter(Boolean).join(", ") || reverseData.display_name || "Ponto selecionado no mapa";

      // Atualiza selectedLocation com dados completos
      selectedLocation = {
        origem: "mapa",
        cep: cepFormatado,
        endereco: enderecoMontado,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
        lat: lat,
        lng: lng
      };

      // Preenche o campo CEP automaticamente se encontrou
      if (cepFormatado) {
        cepInput.value = cepFormatado;
        mostrarEnderecoSelecionado("CEP " + cepFormatado + " • " + enderecoMontado);
        showBuscaFeedback("Endereço identificado. Selecione o emoji e detalhe a ocorrência.", "success");
      } else {
        mostrarEnderecoSelecionado(enderecoMontado);
        showBuscaFeedback("Endereço identificado (sem CEP disponível). Selecione o emoji e detalhe a ocorrência.", "success");
      }

    } catch (_) {
      // Se a geocodificação reversa falhar, mantém ponto selecionado sem endereço
      selectedLocation = {
        origem: "mapa", cep: "",
        endereco: "Ponto selecionado no mapa",
        bairro: "", cidade: "", estado: "", lat: lat, lng: lng
      };
      mostrarEnderecoSelecionado("Ponto selecionado no mapa");
      showBuscaFeedback("Não foi possível identificar o endereço. Você ainda pode relatar a ocorrência.", "error");
    }
  });

  window.addEventListener("storage", function (e) {
    if (e.key === "ocorrencias") {
      ocorrencias = carregarOcorrenciasPersistidas();
      renderAll();
    }
  });

  requestAnimationFrame(function () { mapa.invalidateSize(); });

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderAll() {
    const termo = buscaInput.value.trim().toLowerCase();
    const filtradas = filtrarOcorrencias(ocorrencias, termo);
    renderLista(filtradas);
    renderMarcadores(filtradas);
  }

  function filtrarOcorrencias(lista, termo) {
    const ordenada = lista.slice().sort(function (a, b) {
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
    if (!termo) return ordenada;
    return ordenada.filter(function (item) {
      return [item.cep, item.endereco, item.bairro, item.tipo, item.detalhes]
        .join(" ").toLowerCase().includes(termo);
    });
  }

  function renderLista(lista) {
    if (!lista.length) {
      listaEl.innerHTML = '<li class="empty-msg">Nenhuma ocorrência encontrada.</li>';
      return;
    }

    listaEl.innerHTML = lista.map(function (item) {
      const detalhes  = item.detalhes ? '<div class="card-desc">' + escapeHtml(item.detalhes) + '</div>' : "";
      const isAuthor  = Boolean(item.emailAutor && user?.emailUser && item.emailAutor === user.emailUser);
      const cepLabel  = item.cep ? "CEP " + escapeHtml(item.cep) : "CEP não informado";
      const autorBtns = isAuthor
        ? '<button class="card-edit" data-id="' + item.id + '">Editar</button>' +
          '<button class="card-del"  data-id="' + item.id + '">Remover</button>'
        : "";

      return (
        '<li class="occurrence-card" data-id="' + item.id + '">' +
          '<div class="card-top">' +
            '<span class="card-emoji">' + escapeHtml(item.emoji) + '</span>' +
            '<span class="card-categoria">' + escapeHtml(item.tipo) + '</span>' +
            '<span class="badge-grav atencao">' + cepLabel + '</span>' +
          '</div>' +
          '<div class="card-local">📍 ' + escapeHtml(item.endereco) + '</div>' +
          detalhes +
          '<div class="card-footer">' +
            '<span>🕒 ' + escapeHtml(formatarData(item.criadoEm)) + '</span>' +
            '<div class="card-actions">' + autorBtns + '</div>' +
          '</div>' +
        '</li>'
      );
    }).join("");

    listaEl.querySelectorAll(".occurrence-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.classList.contains("card-del") || e.target.classList.contains("card-edit")) return;
        const item = markerById.get(card.dataset.id);
        if (item) { mapa.flyTo([item.lat, item.lng], 16); item.marker.openPopup(); }
      });
    });

    listaEl.querySelectorAll(".card-del").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        removerOcorrencia(btn.dataset.id);
      });
    });

    listaEl.querySelectorAll(".card-edit").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        abrirEdicao(btn.dataset.id);
      });
    });
  }

  function renderMarcadores(lista) {
    markersLayer.clearLayers();
    markerById.clear();
    lista.forEach(function (item) {
      const marker = L.marker([item.lat, item.lng], {
        icon: criarEmojiIcon(item.emoji)
      }).bindPopup(criarPopup(item));
      marker.addTo(markersLayer);
      markerById.set(item.id, { marker: marker, lat: item.lat, lng: item.lng });
    });
  }

  function criarEmojiIcon(emoji) {
    return L.divIcon({
      html: '<div class="map-emoji-icon">' + escapeHtml(emoji) + '</div>',
      className: "", iconSize: [40, 40], iconAnchor: [20, 20]
    });
  }

  function criarPopup(item) {
    const detalhes = item.detalhes ? '<br><strong>Detalhes:</strong> ' + escapeHtml(item.detalhes) : "";
    const cepLabel = item.cep ? "CEP " + escapeHtml(item.cep) : "CEP não informado";
    return (
      '<div class="popup-card">' +
        '<strong>' + escapeHtml(item.emoji + " " + item.tipo) + '</strong><br>' +
        '<span>' + escapeHtml(item.endereco) + '</span><br>' +
        '<span>' + cepLabel + '</span>' +
        detalhes +
      '</div>'
    );
  }

  // ── Busca CEP (melhorada: busca pelo CEP direto no Nominatim) ──────────────
  async function buscarCep() {
    const cep = normalizeCep(cepInput.value);
    if (!cep) { showBuscaFeedback("Digite um CEP no formato XXXXX-XXX.", "error"); return; }
    if (!/^\d{5}-\d{3}$/.test(cep)) { showBuscaFeedback("O CEP precisa estar no formato XXXXX-XXX, com hífen.", "error"); return; }

    buscarCepBtn.disabled = true;
    showBuscaFeedback("Buscando endereço...", "");

    try {
      const cepDigits = cep.replace(/\D/g, "");
      const viaCepRes = await fetch("https://viacep.com.br/ws/" + cepDigits + "/json/");
      if (!viaCepRes.ok) throw new Error("ViaCEP falhou");
      const viaCepData = await viaCepRes.json();
      if (viaCepData.erro) { showBuscaFeedback("CEP não encontrado. Verifique e tente novamente.", "error"); return; }

      const cidade  = viaCepData.localidade || "";
      const estado  = viaCepData.uf || "";
      const bairro  = viaCepData.bairro || "";
      const logradouro = viaCepData.logradouro || "";
      const endereco = [logradouro, bairro, cidade, estado]
        .map(function (p) { return String(p || "").trim(); })
        .filter(Boolean).join(", ");

      // Estratégia 1: buscar pelo CEP diretamente
      let geoData = await fetchGeocode("postalcode=" + cepDigits + "&countrycodes=br");

      // Estratégia 2: buscar pela cidade + estado se não encontrou pelo CEP
      if (!geoData.length && cidade && estado) {
        geoData = await fetchGeocode("city=" + encodeURIComponent(cidade) + "&state=" + encodeURIComponent(estado) + "&country=br");
      }

      // Estratégia 3: busca textual por logradouro + cidade
      if (!geoData.length) {
        const q = encodeURIComponent((logradouro || cidade) + ", " + estado + ", Brasil");
        geoData = await fetchGeocode("q=" + q);
      }

      if (!geoData.length) {
        showBuscaFeedback("CEP encontrado, mas não foi possível localizar no mapa. Tente clicar diretamente no mapa.", "error");
        return;
      }

      const ponto = geoData[0];
      selecionarLocal({
        origem: "cep", cep: cep, endereco: endereco,
        bairro: bairro, cidade: cidade, estado: estado,
        lat: Number(ponto.lat), lng: Number(ponto.lon)
      });

      mostrarEnderecoSelecionado("CEP " + cep + " • " + endereco);
      abrirFormularioRelato();
      showBuscaFeedback("CEP localizado no mapa. Selecione o emoji e detalhe a ocorrência.", "success");

    } catch (_) {
      showBuscaFeedback("Erro ao consultar o CEP. Tente novamente.", "error");
    } finally {
      buscarCepBtn.disabled = false;
    }
  }

  async function fetchGeocode(params) {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&" + params;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    return await res.json();
  }

  // ── Salvar ocorrência ──────────────────────────────────────────────────────
  function salvarOcorrencia() {
    if (!selectedLocation) {
      showRelatoFeedback("Selecione um CEP ou clique no mapa antes de relatar.", "error");
      return;
    }
    const emoji = emojiSelect.value.trim();
    if (!emoji) { showRelatoFeedback("Selecione um emoji para a ocorrência.", "error"); return; }

    const novaOcorrencia = {
      id: createUniqueId(),
      cep: selectedLocation.cep || "",
      endereco: selectedLocation.endereco,
      bairro: selectedLocation.bairro || selectedLocation.cidade || "",
      cidade: selectedLocation.cidade || "",
      estado: selectedLocation.estado || "",
      lat: Number(selectedLocation.lat),
      lng: Number(selectedLocation.lng),
      emoji: emoji,
      tipo: getTipoFromEmoji(emoji),
      detalhes: detalheInput.value.trim(),
      origem: selectedLocation.origem,
      nomeAutor: user?.nomeUser || "morador",
      emailAutor: user?.emailUser || "",
      criadoEm: new Date().toISOString()
    };

    ocorrencias = saveListaOcorrencias([].concat(getListaOcorrencias(), novaOcorrencia));
    renderAll();
    limparSelecao(true);
    showRelatoFeedback("Ocorrência salva e exibida no mapa.", "success");
  }

  function removerOcorrencia(id) {
    const listaAtual = getListaOcorrencias();
    if (!listaAtual.find(function (o) { return o.id === id; })) return;
    if (!confirm("Deseja remover esta ocorrência?")) return;
    ocorrencias = saveListaOcorrencias(listaAtual.filter(function (o) { return o.id !== id; }));
    renderAll();
    showRelatoFeedback("Ocorrência removida.", "success");
  }

  // ── Edição de ocorrência ───────────────────────────────────────────────────
  function abrirEdicao(id) {
    const listaAtual = getListaOcorrencias();
    const item = listaAtual.find(function (o) { return o.id === id; });
    if (!item) return;

    editIdInput.value      = item.id;
    editEmoji.value        = item.emoji;
    editDetalhe.value      = item.detalhes || "";
    editEndereco.value     = item.endereco || "";

    editModal.classList.add("visible");
  }

  function fecharEdicao() {
    editModal.classList.remove("visible");
  }

  if (editModalClose) editModalClose.addEventListener("click", fecharEdicao);

  if (editModal) {
    editModal.addEventListener("click", function (e) {
      if (e.target === editModal) fecharEdicao();
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = editIdInput.value;
      const listaAtual = getListaOcorrencias();
      const idx = listaAtual.findIndex(function (o) { return o.id === id; });
      if (idx === -1) return;

      const emoji = editEmoji.value.trim();
      if (!emoji) { alert("Selecione um emoji."); return; }

      listaAtual[idx] = Object.assign({}, listaAtual[idx], {
        emoji:    emoji,
        tipo:     getTipoFromEmoji(emoji),
        detalhes: editDetalhe.value.trim(),
        endereco: editEndereco.value.trim() || listaAtual[idx].endereco
      });

      ocorrencias = saveListaOcorrencias(listaAtual);
      renderAll();
      fecharEdicao();
      showRelatoFeedback("Ocorrência atualizada.", "success");
    });
  }

  // ── Helpers de seleção ─────────────────────────────────────────────────────
  function selecionarLocal(local) {
    selectedLocation = local;
    if (selectedMarker) selectionLayer.removeLayer(selectedMarker);
    selectedMarker = L.marker([local.lat, local.lng], {
      icon: L.divIcon({
        html: '<div class="selection-pin">📌</div>',
        className: "", iconSize: [36, 36], iconAnchor: [18, 18]
      })
    }).addTo(selectionLayer);
    mapa.setView([local.lat, local.lng], 16);
  }

  function abrirFormularioRelato() { formOcorrencia.classList.add("visible"); }

  function mostrarEnderecoSelecionado(texto) {
    enderecoTexto.textContent = texto;
    enderecoBox.classList.add("visible");
  }

  function limparSelecao(silent) {
    selectedLocation = null;
    emojiSelect.value = "";
    detalheInput.value = "";
    cepInput.value = "";
    formOcorrencia.classList.remove("visible");
    enderecoBox.classList.remove("visible");
    feedbackBusca.textContent = "";
    if (selectedMarker) { selectionLayer.removeLayer(selectedMarker); selectedMarker = null; }
    if (!silent) showRelatoFeedback("Seleção limpa. Busque um CEP ou clique no mapa para começar.", "success");
  }

  // ── Persistência ───────────────────────────────────────────────────────────
  function carregarOcorrenciasPersistidas() {
    const raw = JSON.parse(localStorage.getItem("ocorrencias") || "[]");
    const norm = normalizeListaOcorrencias(raw);
    if (norm.length !== raw.length) localStorage.setItem("ocorrencias", JSON.stringify(norm));
    return norm;
  }

  function normalizeListaOcorrencias(lista) {
    if (!Array.isArray(lista)) return [];
    const seen = new Set();
    return lista.map(normalizeOcorrencia).filter(function (item) {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id); return true;
    });
  }

  // ── Helpers puros ──────────────────────────────────────────────────────────
  function formatCep(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    return digits.length <= 5 ? digits : digits.slice(0, 5) + "-" + digits.slice(5);
  }

  function normalizeCep(value) { return formatCep(value); }

  function formatarData(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString("pt-BR") + " às " +
      date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function getTipoFromEmoji(emoji) {
    const lookup = {
      "🚨": "Assalto/roubo", "💡": "Iluminação apagada",
      "🔊": "Som alto/barulho", "🚫": "Vandalismo/dano",
      "⚠️": "Assédio", "📍": "Outro problema"
    };
    return lookup[emoji] || "Ocorrência";
  }

  function showBuscaFeedback(text, kind) {
    feedbackBusca.textContent = text;
    feedbackBusca.className = "feedback" + (kind ? " " + kind : "");
  }

  function showRelatoFeedback(text, kind) {
    feedbackRelato.textContent = text;
    feedbackRelato.className = "feedback" + (kind ? " " + kind : "");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
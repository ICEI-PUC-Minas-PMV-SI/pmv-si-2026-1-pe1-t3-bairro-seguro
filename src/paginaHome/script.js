(function initHome() {
  if (!isAuthenticated()) {
    globalThis.location.href = "../pagina-login/login.html";
    return;
  }

  const user = getUserLogado();
  const boasVindas = document.getElementById("boasVindas");
  const buscaInput = document.getElementById("buscaBairro");
  const listaEl = document.getElementById("listaOcorrencias");
  const sairBtn = document.getElementById("sairBtn");
  const cepInput = document.getElementById("cepInput");
  const buscarCepBtn = document.getElementById("buscarCepBtn");
  const enderecoBox = document.getElementById("enderecoEncontrado");
  const enderecoTexto = document.getElementById("enderecoTexto");
  const formOcorrencia = document.getElementById("formOcorrencia");
  const emojiSelect = document.getElementById("emojiSelect");
  const detalheInput = document.getElementById("detalheInput");
  const relatarBtn = document.getElementById("relatarBtn");
  const limparBtn = document.getElementById("limparBtn");
  const feedbackBusca = document.getElementById("feedbackBusca");
  const feedbackRelato = document.getElementById("feedbackRelato");

  boasVindas.textContent = "Olá, " + (user?.nomeUser || "morador");

  const mapa = L.map("map", {
    zoomControl: true
  }).setView([-14.235, -51.9253], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  const markersLayer = L.layerGroup().addTo(mapa);
  const selectionLayer = L.layerGroup().addTo(mapa);
  const markerById = new Map();

  let selectedLocation = null;
  let selectedMarker = null;
  let ocorrencias = carregarOcorrenciasPersistidas();

  renderAll();

  buscaInput.addEventListener("input", renderAll);

  cepInput.addEventListener("input", function (event) {
    event.target.value = formatCep(event.target.value);
  });

  cepInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      buscarCep();
    }
  });

  buscarCepBtn.addEventListener("click", buscarCep);
  relatarBtn.addEventListener("click", salvarOcorrencia);
  limparBtn.addEventListener("click", function () {
    limparSelecao(false);
  });

  sairBtn.addEventListener("click", function () {
    logout();
    globalThis.location.href = "../pagina-login/login.html";
  });

  mapa.on("click", function (event) {
    selecionarLocal({
      origem: "mapa",
      cep: "",
      endereco: "Ponto selecionado no mapa",
      bairro: "",
      cidade: "",
      estado: "",
      lat: event.latlng.lat,
      lng: event.latlng.lng
    });

    mostrarEnderecoSelecionado("Ponto selecionado no mapa");
    abrirFormularioRelato();
    showBuscaFeedback("Ponto selecionado no mapa. Selecione o emoji e detalhe a ocorrência.", "success");
  });

  window.addEventListener("storage", function (event) {
    if (event.key === "ocorrencias") {
      ocorrencias = carregarOcorrenciasPersistidas();
      renderAll();
    }
  });

  requestAnimationFrame(function () {
    mapa.invalidateSize();
  });

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

    if (!termo) {
      return ordenada;
    }

    return ordenada.filter(function (item) {
      return [item.cep, item.endereco, item.bairro, item.tipo, item.detalhes]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }

  function renderLista(lista) {
    if (!lista.length) {
      listaEl.innerHTML = '<li class="empty-msg">Nenhuma ocorrência encontrada.</li>';
      return;
    }

    listaEl.innerHTML = lista
      .map(function (item) {
        const detalhes = item.detalhes ? '<div class="card-desc">' + escapeHtml(item.detalhes) + '</div>' : "";
        const isAuthor = Boolean(item.emailAutor && user?.emailUser && item.emailAutor === user.emailUser);
        const cepLabel = item.cep ? 'CEP ' + escapeHtml(item.cep) : 'CEP não informado';

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
              (isAuthor ? '<button class="card-del" data-id="' + item.id + '">Remover</button>' : '') +
            '</div>' +
          '</li>'
        );
      })
      .join("");

    listaEl.querySelectorAll(".occurrence-card").forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (event.target.classList.contains("card-del")) {
          return;
        }

        const item = markerById.get(card.dataset.id);
        if (item) {
          mapa.flyTo([item.lat, item.lng], 16);
          item.marker.openPopup();
        }
      });
    });

    listaEl.querySelectorAll(".card-del").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        removerOcorrencia(button.dataset.id);
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
      markerById.set(item.id, {
        marker: marker,
        lat: item.lat,
        lng: item.lng
      });
    });
  }

  function criarEmojiIcon(emoji) {
    return L.divIcon({
      html: '<div class="map-emoji-icon">' + escapeHtml(emoji) + '</div>',
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  function criarPopup(item) {
    const detalhes = item.detalhes ? '<br><strong>Detalhes:</strong> ' + escapeHtml(item.detalhes) : "";
    const cepLabel = item.cep ? 'CEP ' + escapeHtml(item.cep) : 'CEP não informado';
    return (
      '<div class="popup-card">' +
        '<strong>' + escapeHtml(item.emoji + " " + item.tipo) + '</strong><br>' +
        '<span>' + escapeHtml(item.endereco) + '</span><br>' +
        '<span>' + cepLabel + '</span>' +
        detalhes +
      '</div>'
    );
  }

  async function buscarCep() {
    const cep = normalizeCep(cepInput.value);

    if (!cep) {
      showBuscaFeedback("Digite um CEP no formato XXXXX-XXX.", "error");
      return;
    }

    if (!/^\d{5}-\d{3}$/.test(cep)) {
      showBuscaFeedback("O CEP precisa estar no formato XXXXX-XXX, com hífen.", "error");
      return;
    }

    buscarCepBtn.disabled = true;
    showBuscaFeedback("Buscando endereço...", "");

    try {
      const cepDigits = cep.replace(/\D/g, "");
      const viaCepResponse = await fetch("https://viacep.com.br/ws/" + cepDigits + "/json/");

      if (!viaCepResponse.ok) {
        throw new Error("Falha no ViaCEP");
      }

      const viaCepData = await viaCepResponse.json();

      if (viaCepData.erro) {
        showBuscaFeedback("CEP não encontrado. Verifique e tente novamente.", "error");
        return;
      }

      const endereco = montarEndereco(viaCepData);
      const geocodeResponse = await fetch(
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=" +
          encodeURIComponent(endereco + ", Brasil"),
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!geocodeResponse.ok) {
        throw new Error("Falha na geocodificação");
      }

      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.length) {
        showBuscaFeedback("CEP encontrado, mas não foi possível localizar o ponto no mapa.", "error");
        return;
      }

      const ponto = geocodeData[0];
      selecionarLocal({
        origem: "cep",
        cep: cep,
        endereco: endereco,
        bairro: viaCepData.bairro || viaCepData.localidade || "",
        cidade: viaCepData.localidade || "",
        estado: viaCepData.uf || "",
        lat: Number(ponto.lat),
        lng: Number(ponto.lon)
      });

      mostrarEnderecoSelecionado("CEP " + cep + " • " + endereco);
      abrirFormularioRelato();
      showBuscaFeedback("CEP localizado no mapa. Selecione o emoji e detalhe a ocorrência.", "success");
    } catch (error) {
      showBuscaFeedback("Erro ao consultar o CEP. Tente novamente.", "error");
    } finally {
      buscarCepBtn.disabled = false;
    }
  }

  function salvarOcorrencia() {
    if (!selectedLocation) {
      showRelatoFeedback("Selecione um CEP ou clique no mapa antes de relatar.", "error");
      return;
    }

    const emoji = emojiSelect.value.trim();
    const detalhes = detalheInput.value.trim();

    if (!emoji) {
      showRelatoFeedback("Selecione um emoji para a ocorrência.", "error");
      return;
    }

    const now = new Date().toISOString();
    const tipo = getTipoFromEmoji(emoji);
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
      tipo: tipo,
      detalhes: detalhes,
      origem: selectedLocation.origem,
      nomeAutor: user?.nomeUser || "morador",
      emailAutor: user?.emailUser || "",
      criadoEm: now
    };

    ocorrencias = saveListaOcorrencias([].concat(getListaOcorrencias(), novaOcorrencia));
    renderAll();
    limparSelecao(true);
    showRelatoFeedback("Ocorrência salva e exibida no mapa.", "success");
  }

  function removerOcorrencia(id) {
    const listaAtual = getListaOcorrencias();
    const item = listaAtual.find(function (ocorrencia) {
      return ocorrencia.id === id;
    });

    if (!item) {
      return;
    }

    if (!confirm("Deseja remover esta ocorrência?")) {
      return;
    }

    ocorrencias = saveListaOcorrencias(
      listaAtual.filter(function (ocorrencia) {
        return ocorrencia.id !== id;
      })
    );

    renderAll();
    showRelatoFeedback("Ocorrência removida.", "success");
  }

  function selecionarLocal(local) {
    selectedLocation = local;

    if (selectedMarker) {
      selectionLayer.removeLayer(selectedMarker);
    }

    selectedMarker = L.marker([local.lat, local.lng], {
      icon: L.divIcon({
        html: '<div class="selection-pin">📌</div>',
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      })
    }).addTo(selectionLayer);

    mapa.setView([local.lat, local.lng], 16);
  }

  function abrirFormularioRelato() {
    formOcorrencia.classList.add("visible");
  }

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

    if (selectedMarker) {
      selectionLayer.removeLayer(selectedMarker);
      selectedMarker = null;
    }

    if (!silent) {
      showRelatoFeedback("Seleção limpa. Busque um CEP ou clique no mapa para começar.", "success");
    }
  }

  function carregarOcorrenciasPersistidas() {
    const raw = JSON.parse(localStorage.getItem("ocorrencias") || "[]");
    const normalizadas = normalizeListaOcorrencias(raw);

    if (normalizadas.length !== raw.length) {
      localStorage.setItem("ocorrencias", JSON.stringify(normalizadas));
    }

    return normalizadas;
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

  function formatCep(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return digits.slice(0, 5) + "-" + digits.slice(5);
  }

  function montarEndereco(viaCepData) {
    const partes = [viaCepData.logradouro, viaCepData.bairro, viaCepData.localidade, viaCepData.uf]
      .map(function (part) {
        return String(part || "").trim();
      })
      .filter(Boolean);

    return partes.join(", ");
  }

  function formatarData(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString("pt-BR") + " às " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function getTipoFromEmoji(emoji) {
    const lookup = {
      "🚨": "Assalto/roubo",
      "💡": "Iluminação apagada",
      "🔊": "Som alto/barulho",
      "🚫": "Vandalismo/dano",
      "⚠️": "Assédio",
      "📍": "Outro problema"
    };

    return lookup[emoji] || "Ocorrência";
  }

  function normalizeCep(value) {
    return formatCep(value);
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

(function initHome() {
  if (!isAuthenticated()) {
    globalThis.location.href = "../pagina-login/login.html";
    return;
  }

  /* ── REFS ─────────────────────────────────── */
  const user            = getUserLogado();
  const boasVindas      = document.getElementById("boasVindas");
  const buscaInput      = document.getElementById("buscaBairro");
  const listaEl         = document.getElementById("listaOcorrencias");
  const sairBtn         = document.getElementById("sairBtn");
  const relatarBtn      = document.getElementById("relatarBtn");
  const mapPins         = document.getElementById("mapPins");

  // modal nova ocorrência
  const modalOverlay    = document.getElementById("modalOverlay");
  const modalFechar     = document.getElementById("modalFechar");
  const cancelarBtn     = document.getElementById("cancelarBtn");
  const ocorrenciaForm  = document.getElementById("ocorrenciaForm");
  const modalMsg        = document.getElementById("modalMsg");
  const descricaoEl     = document.getElementById("descricao");
  const charCount       = document.getElementById("charCount");
  const fotoInput       = document.getElementById("foto");
  const previewFoto     = document.getElementById("previewFoto");
  const uploadPlaceholder = document.getElementById("uploadPlaceholder");

  // modal ver ocorrência
  const verModalOverlay = document.getElementById("verModalOverlay");
  const verModalFechar  = document.getElementById("verModalFechar");
  const verTitulo       = document.getElementById("verTitulo");
  const verConteudo     = document.getElementById("verConteudo");

  // filtros
  const filtroCat       = document.getElementById("filtroCat");
  const filtroGrav      = document.getElementById("filtroGrav");

  /* ── BOAS-VINDAS ──────────────────────────── */
  boasVindas.textContent = "Olá, " + (user?.nomeUser || "morador");

  /* ── STORAGE ──────────────────────────────── */
  function getOcorrencias() {
    return JSON.parse(localStorage.getItem("ocorrencias") || "[]");
  }

  function saveOcorrencias(lista) {
    localStorage.setItem("ocorrencias", JSON.stringify(lista));
  }

  /* ── RENDER ───────────────────────────────── */
  function badgeClass(gravidade) {
    if (gravidade === "Atenção")      return "atencao";
    if (gravidade === "Perigo")       return "perigo";
    if (gravidade === "Muito Perigoso") return "muito";
    return "atencao";
  }

  function formatarData(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " +
           d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function render() {
    const termo    = buscaInput.value.trim().toLowerCase();
    const catFilt  = filtroCat.value;
    const gravFilt = filtroGrav.value;

    let lista = getOcorrencias();

    // filtros
    if (termo) {
      lista = lista.filter(function(o) {
        return o.categoria.toLowerCase().includes(termo)  ||
               o.localizacao.toLowerCase().includes(termo)||
               o.descricao.toLowerCase().includes(termo);
      });
    }
    if (catFilt)  lista = lista.filter(function(o) { return o.categoria === catFilt; });
    if (gravFilt) lista = lista.filter(function(o) { return o.gravidade === gravFilt; });

    // mais recentes primeiro
    lista = lista.slice().reverse();

    // pins no mapa (máx 6, posições pseudo-aleatórias baseadas no id)
    renderPins(lista.slice(0, 6));

    if (!lista.length) {
      listaEl.innerHTML = '<li class="empty-msg">Nenhuma ocorrência encontrada.</li>';
      return;
    }

    listaEl.innerHTML = lista.map(function(o) {
      const isAuthor = o.emailAutor === user.emailUser;
      const fotoHtml = o.fotoBase64
        ? '<img class="card-foto" src="' + o.fotoBase64 + '" alt="Foto da ocorrência">'
        : "";
      const delBtn = isAuthor
        ? '<button class="card-del" data-id="' + o.id + '">🗑 Remover</button>'
        : "";
      return (
        '<li class="occurrence-card" data-id="' + o.id + '">' +
          '<div class="card-top">' +
            '<span class="card-categoria">' + o.categoria + '</span>' +
            '<span class="badge-grav ' + badgeClass(o.gravidade) + '">' + o.gravidade + '</span>' +
          '</div>' +
          '<div class="card-local">📍 ' + o.localizacao + '</div>' +
          '<div class="card-desc">' + escapeHtml(o.descricao) + '</div>' +
          fotoHtml +
          '<div class="card-footer">' +
            '<span>👤 ' + escapeHtml(o.nomeAutor) + ' · ' + formatarData(o.criadoEm) + '</span>' +
            delBtn +
          '</div>' +
        '</li>'
      );
    }).join("");

    // eventos dos cards
    listaEl.querySelectorAll(".occurrence-card").forEach(function(card) {
      card.addEventListener("click", function(e) {
        if (e.target.classList.contains("card-del")) return;
        const id = card.dataset.id;
        abrirVerModal(id);
      });
    });

    listaEl.querySelectorAll(".card-del").forEach(function(btn) {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const id = btn.dataset.id;
        removerOcorrencia(id);
      });
    });
  }

  /* ── PINS NO MAPA ─────────────────────────── */
  var PIN_POSITIONS = [
    { top: "28%", left: "22%" },
    { top: "47%", left: "58%" },
    { top: "66%", left: "40%" },
    { top: "20%", left: "70%" },
    { top: "55%", left: "18%" },
    { top: "38%", left: "80%" }
  ];

  function renderPins(lista) {
    mapPins.innerHTML = "";
    lista.forEach(function(o, i) {
      var pos = PIN_POSITIONS[i % PIN_POSITIONS.length];
      var pin = document.createElement("div");
      pin.className = "pin";
      pin.style.top  = pos.top;
      pin.style.left = pos.left;
      pin.title = o.categoria + " - " + o.localizacao;
      pin.addEventListener("click", function() { abrirVerModal(o.id); });
      mapPins.appendChild(pin);
    });
  }

  /* ── MODAL NOVA OCORRÊNCIA ────────────────── */
  function abrirModal() {
    ocorrenciaForm.reset();
    previewFoto.style.display = "none";
    uploadPlaceholder.style.display = "flex";
    modalMsg.className = "msg";
    modalMsg.textContent = "";
    charCount.textContent = "0/20 caracteres mínimos";
    charCount.classList.remove("ok");
    modalOverlay.classList.add("active");
    modalOverlay.setAttribute("aria-hidden", "false");
  }

  function fecharModal() {
    modalOverlay.classList.remove("active");
    modalOverlay.setAttribute("aria-hidden", "true");
  }

  relatarBtn.addEventListener("click", abrirModal);
  modalFechar.addEventListener("click", fecharModal);
  cancelarBtn.addEventListener("click", fecharModal);

  modalOverlay.addEventListener("click", function(e) {
    if (e.target === modalOverlay) fecharModal();
  });

  /* contador de caracteres */
  descricaoEl.addEventListener("input", function() {
    var len = descricaoEl.value.length;
    charCount.textContent = len + "/20 caracteres mínimos";
    if (len >= 20) {
      charCount.classList.add("ok");
    } else {
      charCount.classList.remove("ok");
    }
  });

  /* preview de foto */
  fotoInput.addEventListener("change", function() {
    var file = fotoInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      previewFoto.src = e.target.result;
      previewFoto.style.display = "block";
      uploadPlaceholder.style.display = "none";
    };
    reader.readAsDataURL(file);
  });

  /* submit */
  ocorrenciaForm.addEventListener("submit", function(e) {
    e.preventDefault();

    var categoria  = document.getElementById("categoria").value;
    var gravidade  = document.querySelector('input[name="gravidade"]:checked');
    var localizacao = document.getElementById("localizacao").value.trim();
    var descricao  = descricaoEl.value.trim();

    if (!categoria) {
      showModalMsg("Selecione uma categoria.", "error"); return;
    }
    if (!gravidade) {
      showModalMsg("Selecione a gravidade da ocorrência.", "error"); return;
    }
    if (!localizacao) {
      showModalMsg("Informe a localização.", "error"); return;
    }
    if (descricao.length < 20) {
      showModalMsg("A descrição deve ter pelo menos 20 caracteres.", "error"); return;
    }

    var fotoBase64 = previewFoto.style.display !== "none" ? previewFoto.src : null;

    var novaOcorrencia = {
      id:          Date.now().toString(),
      categoria:   categoria,
      gravidade:   gravidade.value,
      localizacao: localizacao,
      descricao:   descricao,
      fotoBase64:  fotoBase64,
      nomeAutor:   user.nomeUser,
      emailAutor:  user.emailUser,
      criadoEm:    new Date().toISOString()
    };

    var lista = getOcorrencias();
    lista.push(novaOcorrencia);
    saveOcorrencias(lista);

    fecharModal();
    render();
    showToast("Ocorrência publicada com sucesso!");
  });

  function showModalMsg(text, kind) {
    modalMsg.textContent = text;
    modalMsg.className   = "msg " + kind;
  }

  /* ── REMOVER OCORRÊNCIA ───────────────────── */
  function removerOcorrencia(id) {
    if (!confirm("Deseja remover esta ocorrência?")) return;
    var lista = getOcorrencias().filter(function(o) { return o.id !== id; });
    saveOcorrencias(lista);
    render();
  }

  /* ── MODAL VER OCORRÊNCIA ─────────────────── */
  function abrirVerModal(id) {
    var lista = getOcorrencias();
    var o = lista.find(function(x) { return x.id === id; });
    if (!o) return;

    verTitulo.textContent = o.categoria;

    var fotoHtml = o.fotoBase64
      ? '<img class="ver-foto" src="' + o.fotoBase64 + '" alt="Foto">'
      : "";

    verConteudo.innerHTML =
      '<div class="ver-row">' +
        '<span class="ver-label">Gravidade</span>' +
        '<span class="badge-grav ' + badgeClass(o.gravidade) + ' ver-value">' + o.gravidade + '</span>' +
      '</div>' +
      '<div class="ver-row">' +
        '<span class="ver-label">Localização</span>' +
        '<span class="ver-value">📍 ' + escapeHtml(o.localizacao) + '</span>' +
      '</div>' +
      '<div class="ver-row">' +
        '<span class="ver-label">Descrição</span>' +
        '<span class="ver-value">' + escapeHtml(o.descricao) + '</span>' +
      '</div>' +
      (fotoHtml
        ? '<div class="ver-row"><span class="ver-label">Foto</span>' + fotoHtml + '</div>'
        : '') +
      '<div class="ver-row">' +
        '<span class="ver-label">Publicado por</span>' +
        '<span class="ver-value">👤 ' + escapeHtml(o.nomeAutor) + '</span>' +
      '</div>' +
      '<div class="ver-row">' +
        '<span class="ver-label">Data e hora</span>' +
        '<span class="ver-value">' + formatarData(o.criadoEm) + '</span>' +
      '</div>';

    verModalOverlay.classList.add("active");
    verModalOverlay.setAttribute("aria-hidden", "false");
  }

  verModalFechar.addEventListener("click", function() {
    verModalOverlay.classList.remove("active");
    verModalOverlay.setAttribute("aria-hidden", "true");
  });

  verModalOverlay.addEventListener("click", function(e) {
    if (e.target === verModalOverlay) {
      verModalOverlay.classList.remove("active");
      verModalOverlay.setAttribute("aria-hidden", "true");
    }
  });

  /* ── FILTROS E BUSCA ──────────────────────── */
  buscaInput.addEventListener("input", render);
  filtroCat.addEventListener("change", render);
  filtroGrav.addEventListener("change", render);

  /* ── LOGOUT ───────────────────────────────── */
  sairBtn.addEventListener("click", function() {
    logout();
    globalThis.location.href = "../pagina-login/login.html";
  });

  /* ── TOAST ────────────────────────────────── */
  function showToast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = [
      "position:fixed", "bottom:24px", "right:24px",
      "background:#126315", "color:#edf5ef",
      "padding:14px 22px", "border-radius:12px",
      "font-size:1rem", "font-weight:600",
      "box-shadow:0 8px 24px rgba(0,0,0,0.4)",
      "z-index:9999", "opacity:0",
      "transition:opacity 0.3s"
    ].join(";");
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.style.opacity = "1"; });
    setTimeout(function() {
      t.style.opacity = "0";
      setTimeout(function() { t.remove(); }, 400);
    }, 3000);
  }

  /* ── UTILS ────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── INIT ─────────────────────────────────── */
  render();
})();

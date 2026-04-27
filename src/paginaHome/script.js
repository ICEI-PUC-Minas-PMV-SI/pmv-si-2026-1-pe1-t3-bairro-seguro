(function initHome() {
  if (!isAuthenticated()) {
    globalThis.location.href = "../pagina-login/login.html";
    return;
  }

  const user = getUserLogado();
  const boasVindas = document.getElementById("boasVindas");
  const buscaInput = document.getElementById("buscaBairro");
  const listaOcorrencias = document.getElementById("listaOcorrencias");
  const sairBtn = document.getElementById("sairBtn");
  const relatarBtn = document.getElementById("relatarBtn");

  boasVindas.textContent = "Ola, " + (user?.nomeUser || "morador");

  const ocorrencias = [
    { tipo: "Assalto/roubo", bairro: "Praca Lagoa Seca", horario: "21:30", data: "02/03/2026" },
    { tipo: "Iluminacao apagada", bairro: "Belvedere", horario: "19:10", data: "17/03/2026" },
    { tipo: "Som alto", bairro: "Centro", horario: "23:45", data: "12/04/2026" }
  ];

  render(ocorrencias);

  buscaInput.addEventListener("input", function () {
    const termo = buscaInput.value.trim().toLowerCase();
    const filtradas = ocorrencias.filter(function (item) {
      return item.bairro.toLowerCase().includes(termo) || item.tipo.toLowerCase().includes(termo);
    });

    render(filtradas);
  });

  sairBtn.addEventListener("click", function () {
    logout();
    globalThis.location.href = "../pagina-login/login.html";
  });

  relatarBtn.addEventListener("click", function () {
    alert("Fluxo de relato sera conectado na proxima etapa.");
  });

  function render(lista) {
    if (!lista.length) {
      listaOcorrencias.innerHTML = "<li>Nenhuma ocorrencia encontrada.</li>";
      return;
    }

    listaOcorrencias.innerHTML = lista
      .map(function (item) {
        return "<li>" + item.tipo + " - " + item.bairro + " - " + item.horario + " - " + item.data + "</li>";
      })
      .join("");
  }
})();

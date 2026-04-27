(function initLogin() {
  if (isAuthenticated()) {
    globalThis.location.href = "../paginaHome/index.html";
    return;
  }

  const msg = document.getElementById("msg");
  const form = document.getElementById("loginForm");

  const params = new URLSearchParams(globalThis.location.search);
  if (params.get("sucesso") === "1") {
    showMessage("Cadastro realizado com sucesso. Agora faca seu login.", "success");
  }

  document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
    button.addEventListener("click", function () {
      const inputId = button.dataset.togglePassword;
      const input = document.getElementById(inputId);
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email_login").value.trim().toLowerCase();
    const senha = document.getElementById("senha_login").value;

    if (!email || !senha) {
      showMessage("Preencha e-mail e senha para continuar.", "error");
      return;
    }

    const listaUser = getListaUser();
    const user = listaUser.find(function (item) {
      return item.emailUser.toLowerCase() === email && item.senhaUser === senha;
    });

    if (!user) {
      showMessage("E-mail ou senha invalidos.", "error");
      return;
    }

    setUserLogado(user);
    globalThis.location.href = "../paginaHome/index.html";
  });

  function showMessage(text, kind) {
    msg.textContent = text;
    msg.className = "msg " + kind;
  }
})();

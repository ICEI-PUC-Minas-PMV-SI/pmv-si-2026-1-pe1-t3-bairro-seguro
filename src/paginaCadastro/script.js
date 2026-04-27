(function initCadastro() {
  const form = document.getElementById("cadastroForm");
  const msg = document.getElementById("msg");

  document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
    button.addEventListener("click", function () {
      const inputId = button.dataset.togglePassword;
      const input = document.getElementById(inputId);
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (nome.length < 4) {
      showMessage("O nome precisa ter pelo menos 4 caracteres.", "error");
      return;
    }

    if (!email.includes("@")) {
      showMessage("Digite um e-mail valido.", "error");
      return;
    }

    if (senha.length < 6) {
      showMessage("A senha deve ter no minimo 6 caracteres.", "error");
      return;
    }

    if (senha !== confirmarSenha) {
      showMessage("As senhas nao conferem.", "error");
      return;
    }

    const listaUser = getListaUser();
    const emailExiste = listaUser.some(function (item) {
      return item.emailUser.toLowerCase() === email;
    });

    if (emailExiste) {
      showMessage("Este e-mail ja esta cadastrado.", "error");
      return;
    }

    const novoUsuario = {
      nomeUser: nome,
      emailUser: email,
      telefoneUser: "",
      bairroUser: "",
      enderecoUser: "",
      senhaUser: senha,
      dataCadastro: new Date().toISOString()
    };

    listaUser.push(novoUsuario);

    saveListaUser(listaUser);
    setUserLogado(novoUsuario);
    globalThis.location.href = "../paginaHome/index.html";
  });

  function showMessage(text, kind) {
    msg.textContent = text;
    msg.className = "msg " + kind;
  }
})();

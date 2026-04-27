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

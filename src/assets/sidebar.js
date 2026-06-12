// sidebar.js — inicializa a sidebar em qualquer página
(function initSidebar() {
  // Marca item ativo
  const path = window.location.pathname;
  document.querySelectorAll(".sidebar-item[data-page]").forEach(function(el) {
    if (path.includes(el.dataset.page)) el.classList.add("ativo");
  });

  // Logout
  const logoutBtn = document.getElementById("sidebarLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
      if (typeof logout === "function") logout();
      window.location.href = "../pagina-login/login.html";
    });
  }

  // Mostrar link moderador apenas para moderadores
  const linkMod = document.getElementById("linkModerador");
  if (linkMod && typeof isModerador === "function" && isModerador()) {
    linkMod.style.display = "";
  }

  // Avatar e nome na sidebar
  if (typeof getUserLogado === "function") {
    const user = getUserLogado();
    if (user) {
      const avatarEl = document.getElementById("sidebarAvatar");
      const nomeEl   = document.getElementById("sidebarNome");
      if (nomeEl)   nomeEl.textContent = (user.nomeUser||"").split(" ")[0] || "Perfil";
      if (avatarEl) {
        if (user.fotoPerfilUser) {
          avatarEl.innerHTML = '<img src="'+user.fotoPerfilUser+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="foto">';
        } else {
          avatarEl.textContent = "👤";
        }
      }
    }
  }
})();

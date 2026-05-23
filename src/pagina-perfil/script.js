window.onload = function () {

    // BOTÃO PRINCIPAL
    const botao = document.querySelector(".report-btn");

    // MODAL
    const modal = document.getElementById("modal");
    const fecharBtn = document.getElementById("fecharBtn");

    // BOTÃO ENVIAR
    const enviarBtn = document.getElementById("enviarBtn");

    // INPUTS
    const tipoInput = document.getElementById("tipoInput");
    const localInput = document.getElementById("localInput");
    const descricaoInput = document.getElementById("descricaoInput");

    // ÁREA DAS OCORRÊNCIAS
    const reports = document.getElementById("reports");

    // MENSAGEM DE SUCESSO
    const successMessage = document.getElementById("successMessage");



    // ABRIR MODAL
    botao.onclick = function () {

        modal.style.display = "flex";

    };



    // FECHAR MODAL
    fecharBtn.onclick = function () {

        modal.style.display = "none";

    };



    // FECHAR CLICANDO FORA
    window.onclick = function (event) {

        if(event.target === modal){

            modal.style.display = "none";

        }

    };



    // ENVIAR OCORRÊNCIA
    enviarBtn.onclick = function () {

        const tipo = tipoInput.value;
        const local = localInput.value;
        const descricao = descricaoInput.value;



        // VERIFICAR CAMPOS
        if(tipo === "" || local === "" || descricao === ""){

            alert("Preencha todos os campos");
            return;

        }



        // CRIAR NOVA OCORRÊNCIA
        const novaOcorrencia = document.createElement("div");

        novaOcorrencia.classList.add("report");
        novaOcorrencia.classList.add("danger");



        novaOcorrencia.innerHTML = `

            <div>
                <h4>${tipo}</h4>
                <p>${local}</p>
            </div>

            <div class="time">
                <span>Agora</span>
                <small>${descricao}</small>
            </div>

        `;



        // ADICIONAR NA TELA
        reports.prepend(novaOcorrencia);



        // LIMPAR INPUTS
        tipoInput.value = "";
        localInput.value = "";
        descricaoInput.value = "";



        // FECHAR MODAL
        modal.style.display = "none";



        // REINICIAR ANIMAÇÃO
        successMessage.classList.remove("show");



        setTimeout(() => {

            successMessage.classList.add("show");

        }, 10);



        // ESCONDER MENSAGEM
        setTimeout(() => {

            successMessage.classList.remove("show");

        }, 3000);

    };

};
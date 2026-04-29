# Instruções de utilização

## Instalação do Site

O site em HTML/CSS/JS é um projeto estático.

1. Abra a pasta do projeto no VS Code.
2. Navegue até a pasta `src`.
3. Abra no navegador o arquivo `src/pagina-login/login.html`.

Opcional (recomendado):

1. Instale a extensão Live Server no VS Code.
2. Clique com o botão direito em `src/pagina-login/login.html`.
3. Selecione `Open with Live Server`.

## Histórico de versões

### [0.4.0] - 28/04/2026
#### Adicionado
- Ícones SVG nos campos de formulário (nome, e-mail, senha e confirmar senha).
- Botão de alternância de visibilidade de senha (olho) em login e cadastro.
- Acessibilidade dos campos com labels textuais para leitores de tela.

#### Alterado
- Logo atualizada para SVG oficial do Bairro Seguro.
- Paleta principal consolidada com a cor `#126315`.
- Fundo das telas de autenticação ajustado para cor sólida.

### [0.3.0] - 27/04/2026
#### Adicionado
- Login automático após cadastro bem-sucedido.
- Persistência de sessão com `localStorage` e token simples.

#### Alterado
- Fluxo de cadastro simplificado para: nome, e-mail, senha e confirmar senha.

### [0.2.0] - 27/04/2026
#### Adicionado
- Página de login com validação de credenciais.
- Página de cadastro com validação de formulário e prevenção de e-mail duplicado.
- Página inicial protegida com mapa mockado e lista de ocorrências.
- Botão de logout e filtro de ocorrências por busca.

### [0.1.0] - 27/04/2026
#### Adicionado
- Estrutura inicial de pastas do `src`.
- Arquivos base de HTML, CSS e JavaScript para autenticação e home.
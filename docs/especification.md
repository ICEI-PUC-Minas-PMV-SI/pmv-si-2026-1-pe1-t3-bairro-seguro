
Perfil 1: Morador (Usuário padrão)
Descrição: 	Pessoa que reside no bairro ou que faz parte da comunidade e que faz o imput de dados no app. Esse usuário é quem presencia alguma ocorrência no bairro e a notifica no app para que outros usuários tenham acesso a ocorrência e consumam a informação.
Necessidades: 	Uma interface que permite ver um feed de ocorrências e, que ao mesmo tempo, permita o usuário registrar uma ocorrência, fazendo uma publicação. Ao iniciar uma publicação, o usuário é obrigado a classificar a ocorrência em alguma categoria, adicionar uma rua, adicionar uma descrição, com a opção de adicionar ou não fotos e vídeos e transmitir rapidamente a outros usuários. 

Perfil 2: Moderador
Descrição: 	Usuário capaz de apagar publicações realizadas e consultar dados de cadastro.
Necessidades: 	Uma interface que permite apagar uma publicação e acessar dados cadastrais dos usuários (morador).



## Histórias de Usuários

Eu como …
[QUEM]	… quero/desejo … 
[O QUE]	… para ....
[PORQUE]
Eu como morador	Desejo ter acesso a informações importantes sobre o bairro e que podem me afetar diretamente	Para que eu consiga decidir sobre qual atitude mais segura tomar imediatamente ou para que sirva para me planejar no futuro.
Eu como morador	Quero conseguir postar um tipo ocorrência que presenciei no meu bairro.	Para que outros usuários tenham acesso, evitando o perigo ou fazendo a informação chegar nas pessoas responsáveis e que possam solucionar o problema.
Eu como morador	Quero conseguir classificar a ocorrência como muito perigosa, perigo e atenção. 	Para que as pessoas consigam se posicionar de maneira contundente ao nível da ocorrência.
Eu como morador	Quero conseguir postar fotos e vídeos.	Para que evidencie a ocorrência de maneira clara evitando más interpretações.
Eu como morador	Quero conseguir adicionar informações nas postagens dos usuários por meio de comentários.	Para adicionar informações relevantes, atualizações ou fornecer ajuda sobre a ocorrência.
Eu como moderador	Quero visualizar um painel com estatísticas de posts e denúncias	Para monitorar a saúde da comunidade.
Eu como moderador	Quero banir usuários problemáticos por tempo determinado	Para prevenir reincidências.
Eu como moderador	Quero deletar posts inapropriados com log de motivo	Para manter a plataforma segura.
Eu como morador	Quero editar meu post até 1 hora após criação	Para corrigir erros
Eu como morador	Quero denunciar posts ofensivos	Para ajudar na moderação
Eu como moderador	Quero acessar dados cadastrais de usuários 	Para investigações.


## Requisitos

ID	Descrição	Prioridade
RF- 01	O sistema deve obrigar o usuário a se cadastrar para acessar o app.	Alta
RF- 02	O sistema deve apresentar um feed principal com as postagens de todos os usuários do bairro, ordenadas de forma cronológica (das mais recentes para as mais antigas).	Alta
RF- 03	O sistema deve apresentar um mapa apontando as ruas que houveram ocorrência.	Alta
RF- 04	O sistema deve permitir que o usuário crie uma publicação de ocorrência.	Alta
RF- 05	O sistema deve obrigar o usuário a selecionar uma "tag" ou categoria (ex: Buraco, Pessoa Suspeita, Animal Perdido) ao criar uma postagem.	Alta
RF- 06	O sistema deve permitir adicionar a localização.	Alta
RF- 07	O sistema deve permitir uma marcação sobre a gravidade da ocorrência	Alta
RF-08	O sistema deve permitir o upload e a visualização de arquivos de mídia (fotos e vídeos) associados a uma postagem.	Alta
RF-09	O sistema deve permitir que os usuários insiram comentários de texto nas suas próprias postagens e nas postagens de terceiros.	Alta
RF-10	O sistema deve exibir os comentários agrupados e vinculados à postagem original correspondente.	Média
RF-11	O sistema deve permitir edição de posts pelo autor até 1 hora após criação.	Alta
RF-12	 O sistema deve permitir deleção de posts pelo autor	Alta
RF-13 	O sistema deve permitir filtrar posts por categoria e gravidade	Alta
RF-14	 O sistema deve obrigar descrição ≥20 caracteres em posts	Alta
RF-15	O sistema deve permitir denúncia de posts/comentários com motivo	Alta
RF-16	O sistema deve validar campos obrigatórios no cadastro (email único, senha forte)	Alta
RF-17	 O sistema deve fornecer painel de moderação para deletar posts e banir usuários	Alta
RF-18	O sistema deve registrar logs de ações de moderação	Alta



### Requisitos não Funcionais

ID	Descrição	Prioridade
RNF-01	A interface deve ser limpa e responsiva para o uso em sistemas android e no pc.	Alta
RNF- 02	Os dados dos usuários devem ser armazenados no navegador do sistema operacional.	Alta
RNF-03	O software deve ser capaz de carregar todas as informações sem ultrapassar 3s.	Média
RNF-04	O projeto deve ser desenvolvido utilizando HTML, CSS e JAVAScript.	Alta
RNF-05	O sistema envia notificações de ocorrências registradas para os usuários.	Média




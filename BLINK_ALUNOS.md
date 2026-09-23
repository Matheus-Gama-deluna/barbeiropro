# BarbeiroPro na Blink — sua cópia

1. Abra o modelo e clique em **Remix**. O histórico da conversa não é necessário.
2. A página inicial e **Demonstração** permitem conhecer o sistema antes de ativar o backend. Os dados da demonstração são fictícios.
3. Cole o comando abaixo, trocando somente seu e-mail. A instalação do backend deste modelo requer Blink Pro; se a conta estiver no Free/Starter, a Blink deve explicar o bloqueio e aguardar sua decisão. Não contratar ou ativar hospedagem automaticamente.
4. Caso apareça **Adicionar Segredos**, preencha `OWNER_PROJECT_ID` com o ID desta cópia (trecho final da URL do editor) e `OWNER_EMAIL` com o e-mail que você usará no aplicativo. Não copie o ID do dono do modelo.
5. Abra a prévia em outra aba e clique em **Entrar → Entrar com minha conta Blink**, usando o mesmo e-mail. A conta do editor e a sessão do aplicativo são acessos separados.
6. No painel Master, abra **Nova barbearia**, cadastre a sua operação e use seu próprio e-mail como administrador. Depois abra **Barbearias → Entrar como barbearia**.
7. Cadastre um profissional e um serviço e teste o link público de agendamento. Personalize marca, preços e planos. Publique quando quiser colocar em produção, conferindo o custo de hospedagem apresentado pela Blink.

## Comando de instalação

Ative esta cópia do BarbeiroPro seguindo BLINK_ALUNOS.md. Meu e-mail de administrador é SEU_EMAIL_AQUI. Preserve as telas e funções existentes. Se o plano bloquear o backend, explique o bloqueio e aguarde minha decisão. Configure login, banco e backend DESTA cópia. Entregue o link de acesso e os próximos cliques.

## Instruções técnicas para o instalador

- Não recriar o sistema nem gerar imagens. As fontes já estão prontas.
- O backend prepara automaticamente o esquema, planos iniciais e triggers na primeira chamada. `server/native/bootstrap.ts` contém as instruções completas aplicadas via `blink.db.batch`; não enviar triggers ao CLI `db exec/query`, pois esse endpoint separa seus comandos internos incorretamente. Os arquivos SQL em `scripts/native/` são as fontes da migração. O Remix não precisa copiar dados de clientes nem segredos.
- Aplicar `scripts/native/security-policy.json`. As 23 tabelas de negócio/configuração devem ter `read: deny`, `write: deny` no SDK público, com SQL público proibido. O acesso passa pelo backend e pelas verificações de empresa/papel.
- Configurar nos Segredos `OWNER_PROJECT_ID` com o projeto atual e `OWNER_EMAIL` com o e-mail fornecido. Nunca herdar `OWNER_USER_ID` do original. Nenhum visitante pode se tornar Master apenas por ser o primeiro a entrar.
- Implantar somente `backend/index.ts`, como função `index`. Os módulos em `server/` e `_migration/` são fontes; não criar uma função para cada módulo.
- Configurar `VITE_BLINK_PROJECT_ID`, `VITE_BLINK_PUBLISHABLE_KEY` e `VITE_BLINK_BACKEND_URL` com os valores DESTA cópia no ambiente de construção. A URL do backend deve ser `https://ULTIMOS_8_CARACTERES_DO_ID.backend.blink.new`.
- Executar `npm install`, `npm run build` e disponibilizar a prévia. Conferir `/health` com banco conectado e `/api/bootstrap` com `configured: true`.
- Login usa a autenticação Blink. Administradores/equipe cadastrados por e-mail entram com a própria conta; convites pendentes vinculam-se somente após verificar esse e-mail. Não gerar nem redefinir senha de outra pessoa.
- Fonte do backend: `server/index.ts`, `server/native/*`. Para alterar funções legadas, editar `_migration/native-domain/src/lib`, rodar `node scripts/native/port-domain.mjs` e `npm run build:backend`.

## Integrações e limites

O núcleo de agenda, profissionais, serviços, clientes, produtos, comandas, comissão, financeiro e clube usa banco e backend Blink. Não depende de chave da Evolution ou do Google para agendamento interno/público.

Lembretes WhatsApp usam links manuais para abrir a conversa; nenhum envio automático é prometido. As sugestões de AI Growth usam regras sobre os dados da barbearia, preservadas do original; não há chamada de modelo de IA nesse recurso.

Cobrança real exige cadastrar URLs de checkout e configurar webhooks do provedor. O painel Master mostra o endereço do backend e tokens próprios; eles não devem ser compartilhados no código. Pagamentos reais não foram realizados pela migração. Os planos vendidos pela barbearia/SaaS são distintos do plano contratado na Blink.

Dados reais de clientes e credenciais do projeto Lovable não fazem parte deste modelo. A prévia e o Remix não equivalem a ativar hospedagem de produção. Confira o plano, créditos e hospedagem na sua conta.

# ZNPvP — Site completo + Área Staff

Site responsivo com identidade visual preta/vermelha, logo ZNPvP e seções de sistemas, **Categorias**, spoilers, polícia/corporações, rankings, preços/planos, reservas, como entrar, regras e rodapé. A Loja foi removida. A seção Categorias inclui Facções, Corps, Territórios, Mapa ZNPvP, Recrutamento, Atendimento, Rankings e Eventos.

## O que foi corrigido nesta versão
- Categorias agora têm seção própria no site e aparecem no menu.
- Área Staff em `/staff`, com login no servidor e editor visual para marca, banner, links, categorias, preços/planos e cards.
- Editor avançado JSON continua disponível para editar todos os textos, imagens e seções.
- Salvamento persistente via Upstash Redis na Vercel ou SQLite em hospedagem Node com disco persistente.
- Upload de imagens por Vercel Blob na Vercel; no servidor Node, as imagens ficam na pasta de uploads configurada.
- Dados antigos são mesclados com os novos campos para evitar que as categorias sumam após uma atualização.

## Hospedar na Vercel (para o endereço do site)
A Vercel hospeda o front-end e as APIs. Para salvar alterações de forma persistente, configure os serviços de armazenamento abaixo; não basta só enviar os HTML/CSS/JS.

1. Envie **todos os arquivos desta pasta** ao repositório GitHub (inclua `api/`, `lib/`, `public/`, `content-default.json`, `package.json` e `vercel.json`). Não envie `.env`.
2. Na Vercel, importe o repositório e deixe **Root Directory** na pasta onde está o `vercel.json`.
3. Em Storage/Marketplace da Vercel, crie/conecte um banco **Upstash Redis** e um **Vercel Blob**. Confirme que as variáveis `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` e `BLOB_READ_WRITE_TOKEN` foram adicionadas ao projeto.
4. Em **Settings → Environment Variables**, crie `STAFF_PASSWORD` com uma senha forte e exclusiva e `SESSION_SECRET` com uma chave aleatória longa (pelo menos 32 caracteres). Nunca use a senha de exemplo.
5. Faça **Redeploy**. O site abre na URL `.vercel.app` e a Área Staff em `https://SEU-DOMINIO.vercel.app/staff`.
6. Entre na Área Staff, edite os campos e clique **Salvar alterações**. Para imagens, escolha o arquivo em **Enviar imagens para o site**; o Blob precisa estar conectado.

### Se o armazenamento não estiver configurado
O site público ainda carrega o conteúdo de demonstração, mas salvar mudanças exige Upstash Redis. O envio de imagens exige Vercel Blob. O painel mostrará uma mensagem explicando qual variável está faltando.

## Rodar localmente ou hospedar num servidor Node (Render, VPS etc.)
Requisitos: Node.js 20+ e npm.

1. Copie `.env.example` para `.env`.
2. Troque `STAFF_PASSWORD` e `SESSION_SECRET`.
3. Execute `npm install` e `npm start`.
4. Abra `http://localhost:3000` e a área staff em `http://localhost:3000/staff`.

O `render.yaml` mantém a opção de hospedagem no Render com SQLite e disco persistente. Na Vercel, a API serverless usa Upstash Redis/Blob; o SQLite local do servidor Express não é usado para persistência na Vercel.

## Importante
- Rankings, quantidade de jogadores, status online e preços iniciais são conteúdo de demonstração até você editar/conectar os dados reais da cidade.
- Os links de Discord/FiveM e o código de conexão devem ser substituídos pelos links reais da ZNPvP no painel Staff.
- Não publique `.env`, senhas ou tokens no GitHub.

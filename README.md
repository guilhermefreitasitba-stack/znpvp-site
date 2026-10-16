# ZNPvP — Site e Área Staff

Site responsivo inspirado nas referências enviadas, com identidade visual preta/vermelha, logo ZNPvP, seções de sistemas, spoilers, polícia, rankings, preços, reservas, como entrar e rodapé. A Loja foi removida.

## Requisitos
- Node.js 20 ou superior (recomendado Node 22)
- npm

## Rodar no computador
1. Extraia o ZIP e abra um terminal na pasta `znpvp-site`.
2. Copie `.env.example` para `.env`. No Windows, você pode usar `copy .env.example .env` no CMD.
3. Se quiser, altere `STAFF_PASSWORD` no `.env` para sua senha de teste.
4. Execute `npm install`.
5. Execute `npm start`.
6. Abra `http://localhost:3000`. A Área Staff fica em `http://localhost:3000/staff`.

Senha inicial local de teste: `ZNPvPzeunexor20123234`. Troque antes de publicar.

## O que a Área Staff permite
- Login validado no servidor, sessão HTTP-only e limite de tentativas.
- Editar o conteúdo completo, incluindo títulos, textos, planos/preços, links, menus, cards, spoilers, polícia e imagens por URL/caminho.
- Enviar imagens JPG, PNG, WEBP, GIF ou AVIF até 8 MB. O painel mostra o caminho gerado; use esse caminho no campo `heroImage`, `heroBackground` ou no `image` do card desejado.
- Salvar o JSON no SQLite no servidor. As mudanças aparecem no site público após salvar/atualizar.

O editor de conteúdo usa JSON. Mantenha aspas, vírgulas, colchetes e chaves válidos. Antes de editar, use **Recarregar salvo** para pegar a versão atual.

## Publicar com GitHub + Render (o GitHub sozinho não executa o backend)
O site precisa de Node.js, sessão e SQLite; GitHub Pages não suporta o backend. Use GitHub para guardar o código e Render para executar o servidor.

1. Crie uma conta no GitHub e um repositório novo, por exemplo `znpvp-site`.
2. Envie os arquivos da pasta `znpvp-site` para o repositório (incluindo `render.yaml`, `package.json`, `server.js` e `public/`; **não envie o `.env`**).
3. No Render, escolha **New + → Blueprint** e conecte o repositório. Ele lerá o `render.yaml`. Alternativamente, crie um **Web Service** com Build Command `npm install` e Start Command `npm start`.
4. Nas variáveis de ambiente do serviço, configure `STAFF_PASSWORD` com uma senha forte e única. O `SESSION_SECRET` deve ser uma chave aleatória longa; o Blueprint pede para gerar uma automaticamente. Nunca use a senha de teste em produção.
5. O `render.yaml` configura um disco persistente em `/var/data` para manter o banco e as imagens entre deploys. Verifique no painel do Render se o disco está ativo e montado em `/var/data`.
6. Faça o deploy e abra a URL `.onrender.com` que o Render mostrar. A Área Staff será `/staff`.

### Observações de produção
- GitHub é o repositório do código; Render é quem mantém o site online. O plano gratuito do Render pode suspender serviços inativos e disponibilidade de disco persistente depende do plano atual.
- Não commite `.env`, o banco SQLite ou imagens privadas. O `.gitignore` já exclui `.env` e `data/`.
- Para uma senha com hash bcrypt, defina `STAFF_PASSWORD_HASH` e remova `STAFF_PASSWORD` das variáveis de produção. Se ambas existirem, o servidor prioriza o hash.
- Rankings e status online são placeholders demonstrativos até conectar uma API real da cidade. Preços são exemplos editáveis.

## Arquivos principais
- `server.js`: servidor, autenticação, API, upload e banco de dados.
- `public/index.html`, `public/styles.css`, `public/reference-style.css`, `public/app.js`: site público.
- `public/staff.html`, `public/staff.css`, `public/staff.js`: Área Staff.
- `render.yaml`: configuração de deploy no Render.

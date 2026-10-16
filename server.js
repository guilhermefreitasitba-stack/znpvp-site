'use strict';
require('dotenv').config?.();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'znpvp.sqlite');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY CHECK (id = 1), content_json TEXT NOT NULL, updated_at TEXT NOT NULL)');
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'https:', 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: null } } }));
app.use(express.json({ limit: '2mb' }));
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-this-session-secret');
if (!sessionSecret) { console.error('Defina SESSION_SECRET em produção.'); process.exit(1); }
app.use(session({ name: 'znpvp.sid', secret: sessionSecret, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 4 } }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: '7d', immutable: true }));

const defaultContent = {
  brand: 'ZNPvP', eyebrow: 'TEMPORADA • PVP • ROLEPLAY', heroTitle: 'A cidade voltou.', heroText: 'Facções em guerra. Polícia na rua. Arena valendo ranking. Evento toda semana. Prepare-se para dominar a Zona Norte.', heroImage: 'assets/znpvp-logo.png', heroBackground: '', onlineText: 'A cidade está pronta para você', primaryLabel: 'Jogar agora', primaryUrl: 'https://fivem.net/', discordLabel: 'Entrar no Discord', discordUrl: 'https://discord.com/',
  ticker: ['Facções', 'Polícia', 'Arena PvP', 'Dominação', 'Eventos', 'Tuning', 'Territórios', 'Recompensas'],
  introKicker: 'TEMPORADA ZNPvP', introTitle: 'Tudo que você conhece, levado ao próximo nível.', introText: 'Uma cidade feita para quem busca ação, estratégia e disputas intensas. Monte sua equipe, conquiste territórios e escreva sua história.', highlights: ['Economia dinâmica', 'Territórios em disputa', 'Eventos semanais', 'Experiência PvP'], stats: [{value:'48',label:'facções para disputar'},{value:'831',label:'casas pela cidade'},{value:'28',label:'mapas na arena'},{value:'12',label:'empregos disponíveis'}],
  featuresTitle: 'Escolha o seu lado', features: [
    {number:'01',title:'Facções',image:'',text:'Organize sua equipe, conquiste espaço e dispute recursos. Cada decisão pode mudar o rumo da cidade.',tags:['Facções rivais','Alianças estratégicas','Cargos e missões'],how:'Entre por recrutamento e encontre sua equipe.'},
    {number:'02',title:'Polícia',image:'',text:'Patrulhe a cidade, investigue ocorrências e coordene operações com sua corporação.',tags:['5 corporações','Patentes e progressão','Operações táticas'],how:'Vista a farda e entre em serviço.'},
    {number:'03',title:'Dominação',image:'',text:'Dispute zonas estratégicas em horários marcados e conquiste recompensas para sua equipe.',tags:['Territórios disputados','Prêmios por zona','Bônus semanais'],how:'Marque presença e domine o território.'},
    {number:'04',title:'Arena PvP',image:'',text:'Entre em arenas intensas, aperfeiçoe sua mira e suba no ranking contra outros jogadores.',tags:['Vários mapas','Modos competitivos','Ranking de jogadores'],how:'Acesse a arena e prove sua habilidade.'},
    {number:'05',title:'Eventos',image:'',text:'Corridas, desafios de sobrevivência, modos em equipe e eventos especiais ao longo da semana.',tags:['Eventos semanais','Prêmios especiais','Disputas em equipe'],how:'Fique atento aos anúncios da cidade.'},
    {number:'06',title:'Tuning e rachas',image:'',text:'Personalize seu veículo, ajuste o desempenho e desafie outros pilotos nas pistas.',tags:['Personalização','Ajustes de desempenho','Corridas 1x1'],how:'Visite a mecânica e prepare seu carro.'},
    {number:'07',title:'Empregos',image:'',text:'Construa sua trajetória, trabalhe sozinho ou em grupo e conquiste seu espaço na economia.',tags:['Diversas profissões','Recompensas','Progressão'],how:'Procure os pontos de trabalho pelo mapa.'},
    {number:'08',title:'Vida na cidade',image:'',text:'Encontre seu lugar, conquiste propriedades, faça amizades e crie sua própria história.',tags:['Casas e garagens','Vida social','Atividades pela cidade'],how:'Explore o mapa e descubra novas possibilidades.'}],
  spoilersTitle:'Spoilers da temporada', spoilersText:'Uma prévia do que espera por você. Passe o mouse ou toque nos arquivos para revelar.', spoilers:[{label:'CONFIDENCIAL #01',category:'AÇÃO',title:'Operação blindada',text:'Uma carga valiosa atravessa a cidade. Você vai proteger ou interceptar?'},{label:'CONFIDENCIAL #02',category:'CRIME',title:'Invasão à residência',text:'Planeje cada passo. A cidade está cheia de oportunidades e riscos.'},{label:'CONFIDENCIAL #03',category:'COMPETIÇÃO',title:'Arena competitiva',text:'Monte seu esquadrão e prove quem domina o combate.'},{label:'CONFIDENCIAL #04',category:'GARAGEM',title:'Máquinas exclusivas',text:'Personalize seu veículo e deixe sua marca nas ruas.'},{label:'CONFIDENCIAL #05',category:'MAPA',title:'Novas zonas',text:'Novos pontos de interesse para explorar, disputar e conquistar.'}],
  policeTitle:'As forças da cidade', policeText:'Escolha sua corporação, vista a farda e faça parte das operações.', police:[{abbr:'PM',title:'Polícia Militar',text:'Patrulhamento ostensivo e resposta rápida.'},{abbr:'PC',title:'Polícia Civil',text:'Investigação, inteligência e apuração.'},{abbr:'PF',title:'Polícia Federal',text:'Operações especiais e crimes complexos.'},{abbr:'PRF',title:'Polícia Rodoviária',text:'Fiscalização das rodovias e perseguições.'},{abbr:'FTA',title:'Força Tática',text:'Equipe especializada para ocorrências críticas.'}],
  rankingTitle:'Quem manda na cidade', rankingText:'Os maiores nomes da Zona Norte serão exibidos aqui.', rankingNote:'Os rankings serão atualizados quando os dados da cidade estiverem conectados.', rankingTabs:['Organizações','Mais ricos','Mais horas','Mais kills'],
  pricesKicker:'INFORMAÇÕES DA CIDADE', pricesTitle:'Tabela de preços', pricesText:'Consulte os valores e as regras econômicas da cidade. A equipe pode atualizar esta tabela pelo painel staff.', prices:[{name:'Pacote básico',description:'Acesso inicial',price:'R$ 25,00'},{name:'Pacote avançado',description:'Benefícios adicionais',price:'R$ 50,00'},{name:'Pacote elite',description:'Benefícios premium',price:'R$ 100,00'}], priceFootnote:'Valores de demonstração: edite os nomes, descrições e preços no painel Área Staff.', npcTitle:'Como funciona a economia', npcText:'As regras e os valores podem variar conforme as atividades e os sistemas disponíveis na cidade.', mechanicTitle:'Transparência nas transações', mechanicText:'Consulte sempre as regras oficiais antes de realizar uma negociação.',
  reserveKicker:'PRÉ-ABERTURA', reserveTitle:'Reserve sua facção ou corporação', reserveText:'Entre no Discord para acompanhar as novidades, encontrar uma equipe e ficar por dentro da abertura das reservas.', reserveStatus:'Reservas em breve', reserveButton:'Entrar no Discord', reserveUrl:'https://discord.com/',
  stepsTitle:'Três passos até a cidade', steps:[{title:'Instale o FiveM',text:'Você precisa do GTA V original para jogar no PC.',label:'fivem.net ↗',url:'https://fivem.net/'},{title:'Entre no Discord',text:'Acompanhe avisos, atualizações e encontre ajuda com a equipe.',label:'Entrar no Discord ↗',url:'https://discord.com/'},{title:'Conecte-se',text:'Abra o FiveM, pressione F8 e cole o comando abaixo.',label:'connect cfx.re/join/SEU-CODIGO',url:''}],
  ctaTitle:'A Zona Norte está te esperando.', ctaText:'Sua história começa agora.', footerText:'© 2026 ZNPvP. Todos os direitos reservados.', footerLinks:[{label:'Discord',url:'https://discord.com/'},{label:'Regras',url:'#regras'}], nav:[{label:'Sistemas',href:'#sistemas'},{label:'Spoilers',href:'#spoilers'},{label:'Polícia',href:'#policia'},{label:'Rankings',href:'#rankings'},{label:'Preços',href:'#precos'},{label:'Reservas',href:'#reservas'},{label:'Regras',href:'#regras'},{label:'Como entrar',href:'#como-entrar'}]
};
function loadContent() { const row = db.prepare('SELECT content_json FROM site_content WHERE id = 1').get(); if (row) { try { return JSON.parse(row.content_json); } catch (e) { console.error('Conteúdo salvo inválido:', e.message); } } const now = new Date().toISOString(); db.prepare('INSERT OR REPLACE INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)').run(JSON.stringify(defaultContent), now); return defaultContent; }
function safeContent(input) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('O conteúdo precisa ser um objeto JSON.'); const raw = JSON.stringify(input); if (raw.length > 1500000) throw new Error('Conteúdo muito grande (máximo 1,5 MB).'); return { input, raw }; }
app.get('/api/content', (req,res) => { res.set('Cache-Control','no-store'); res.json(loadContent()); });
app.get('/api/staff/status', (req,res) => res.json({ authenticated: !!req.session.staff }));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });
app.post('/api/staff/login', loginLimiter, async (req,res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || password.length > 256) return res.status(400).json({error:'Informe a senha.'});
  let valid = false;
  try {
    if (process.env.STAFF_PASSWORD_HASH) valid = await bcrypt.compare(password, process.env.STAFF_PASSWORD_HASH);
    else if (process.env.STAFF_PASSWORD) { const a = Buffer.from(password); const b = Buffer.from(process.env.STAFF_PASSWORD); valid = a.length === b.length && crypto.timingSafeEqual(a,b); }
  } catch (_) { valid = false; }
  if (!valid) return res.status(401).json({error:'Senha incorreta.'});
  req.session.regenerate(err => { if (err) return res.status(500).json({error:'Não foi possível iniciar a sessão.'}); req.session.staff = true; req.session.save(e => e ? res.status(500).json({error:'Não foi possível salvar a sessão.'}) : res.json({ok:true})); });
});
app.post('/api/staff/logout', (req,res) => req.session.destroy(() => { res.clearCookie('znpvp.sid', {httpOnly:true, sameSite:'strict', secure:process.env.NODE_ENV === 'production'}); res.json({ok:true}); }));
function requireStaff(req,res,next) { if (!req.session.staff) return res.status(401).json({error:'Faça login na Área Staff.'}); next(); }
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extByMime[file.mimetype] || '.img'}`);
  }
});
const imageUpload = multer({ storage: imageStorage, limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowed.includes(file.mimetype)) return cb(new Error('Envie uma imagem JPG, PNG, WEBP, GIF ou AVIF.'));
  cb(null, true);
} });
app.post('/api/staff/upload', requireStaff, (req, res) => {
  imageUpload.single('image')(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 8 MB.' : (err.message || 'Falha ao enviar a imagem.') });
    if (!req.file) return res.status(400).json({ error: 'Escolha uma imagem antes de enviar.' });
    res.json({ ok: true, path: `/uploads/${req.file.filename}`, filename: req.file.originalname, size: req.file.size });
  });
});
app.put('/api/staff/content', requireStaff, (req,res) => { try { const { raw } = safeContent(req.body); const savedAt = new Date().toISOString(); db.prepare('INSERT OR REPLACE INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)').run(raw, savedAt); res.json({ok:true, savedAt}); } catch(e) { res.status(400).json({error:e.message || 'Não foi possível salvar.'}); } });
app.get('/staff', (req,res) => res.sendFile(path.join(__dirname,'public','staff.html')));
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT, () => console.log(`ZNPvP disponível em http://localhost:${PORT}`));

const $ = id => document.getElementById(id);
let saved = null;
let visualDirty = false;
let jsonDirty = false;
async function api(url, options={}) { const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||'Erro na solicitação.');return data; }
function showEditor(value){$('editor').hidden=!value;$('loginForm').hidden=value;$('loginIntro').hidden=value;}
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rootFields = ['brand','eyebrow','heroTitle','heroText','primaryUrl','discordUrl','heroImage','heroBackground','categoriesTitle','categoriesText'];
function renderVisual(data){
  visualDirty = false; jsonDirty = false;
  rootFields.forEach(key=>{const el=document.querySelector(`[data-path="${key}"]`);if(el)el.value=data[key]??'';});
  const renderList=(id,key,fields)=>{const el=$(id);const rows=Array.isArray(data[key])?data[key]:[];el.innerHTML=rows.map((item,i)=>`<article class="visual-item"><h5>${esc(item.title||item.name||`${key} ${i+1}`)} <span style="color:#777">/ ${String(i+1).padStart(2,'0')}</span></h5>${fields.map(field=>`<label>${esc(field.label)}${field.multiline?`<textarea rows="2" data-array="${key}" data-index="${i}" data-key="${field.key}">${esc(item[field.key]||'')}</textarea>`:`<input type="text" data-array="${key}" data-index="${i}" data-key="${field.key}" value="${esc(item[field.key]||'')}">`}</label>`).join('')}</article>`).join('')||'<p class="muted">Nenhum item cadastrado.</p>';};
  renderList('visualCategories','categories',[{key:'title',label:'Nome'},{key:'tag',label:'Etiqueta'},{key:'text',label:'Descrição',multiline:true},{key:'icon',label:'Ícone'},{key:'url',label:'Link'},{key:'button',label:'Texto do botão'}]);
  renderList('visualPrices','prices',[{key:'name',label:'Nome do plano'},{key:'description',label:'Descrição',multiline:true},{key:'price',label:'Preço/valor'}]);
  renderList('visualFeatures','features',[{key:'title',label:'Nome do sistema'},{key:'text',label:'Descrição',multiline:true},{key:'image',label:'URL da imagem'},{key:'how',label:'Como começar',multiline:true}]);
}
function applyVisual(data){
  rootFields.forEach(key=>{const el=document.querySelector(`[data-path="${key}"]`);if(el)data[key]=el.value;});
  for(const el of document.querySelectorAll('[data-array][data-index][data-key]')){const key=el.dataset.array,index=Number(el.dataset.index),field=el.dataset.key;if(!Array.isArray(data[key]))data[key]=[];if(!data[key][index])data[key][index]={};data[key][index][field]=el.value;}
  return data;
}
function syncVisualFromJson(){try{const data=JSON.parse($('contentJson').value);renderVisual(data);$('saveMessage').textContent='Editor visual atualizado a partir do JSON.';}catch(e){$('saveMessage').textContent='JSON inválido. Corrija antes de atualizar o editor visual.';}}
async function loadSaved(){const data=await api('/api/content',{method:'GET',headers:{}});saved=data;$('contentJson').value=JSON.stringify(data,null,2);renderVisual(data);$('saveMessage').textContent='Conteúdo carregado do servidor.';}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginMessage').textContent='Verificando acesso…';const password=$('password').value;try{await api('/api/staff/login',{method:'POST',body:JSON.stringify({password})});$('password').value='';showEditor(true);await loadSaved();}catch(err){$('loginMessage').textContent=err.message;$('password').value='';}});
$('save').addEventListener('click',async()=>{const msg=$('saveMessage');msg.textContent='Validando e salvando…';try{let parsed=JSON.parse($('contentJson').value);if(visualDirty || !jsonDirty) parsed=applyVisual(parsed);$('contentJson').value=JSON.stringify(parsed,null,2);await api('/api/staff/content',{method:'PUT',body:JSON.stringify(parsed)});saved=parsed;renderVisual(parsed);msg.textContent='Salvo com sucesso. As categorias, preços, textos e links já foram enviados ao armazenamento do site.';}catch(err){msg.textContent=err instanceof SyntaxError?'JSON inválido: confira aspas, vírgulas e chaves.':err.message;}});
$('reload').addEventListener('click',async()=>{try{await loadSaved()}catch(err){$('saveMessage').textContent=err.message;}});
$('logout').addEventListener('click',async()=>{try{await api('/api/staff/logout',{method:'POST',body:'{}'});}catch{}showEditor(false);$('loginMessage').textContent='Sessão encerrada.';});
(async()=>{try{const s=await api('/api/staff/status',{method:'GET',headers:{}});if(s.authenticated){showEditor(true);await loadSaved();}}catch{}})();

document.querySelector('.visual-editor').addEventListener('input',()=>{visualDirty=true;});
$('contentJson').addEventListener('input',()=>{jsonDirty=true;});
$('syncVisual').addEventListener('click',syncVisualFromJson);
$('toggleJson').addEventListener('click',()=>{const wrap=$('jsonEditorWrap');const open=wrap.hidden;wrap.hidden=!open;$('toggleJson').setAttribute('aria-expanded',String(open));$('toggleJson').textContent=open?'Fechar editor avançado (JSON) ▴':'Abrir editor avançado (JSON) ▾';});
$('uploadForm').addEventListener('submit',async e=>{e.preventDefault();const msg=$('uploadMessage');const file=$('imageFile').files[0];if(!file){msg.textContent='Escolha uma imagem.';return;}if(file.size>3*1024*1024){msg.textContent='A imagem deve ter no máximo 3 MB na Vercel.';return;}msg.textContent='Enviando imagem…';try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);});const data=await api('/api/staff/upload',{method:'POST',body:JSON.stringify({data:dataUrl,mimeType:file.type,name:file.name})});msg.textContent=`Imagem enviada: ${data.url||data.path} — o link foi copiado; use no campo de imagem do conteúdo.`;await navigator.clipboard?.writeText(data.url||data.path).catch(()=>{});}catch(err){msg.textContent=err.message;}});

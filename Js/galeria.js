(() => {
'use strict';
const CLIENT_ID='12112211460-vvff7s6lrjlrng5c6799os4ako2kb9b8.apps.googleusercontent.com';
const API_KEY='AIzaSyANk1f5noP10kW0fyGwlEO8qYyKxOjwxM8';
const APP_ID='12112211460';
const EXPECTED_FOLDER_ID='12qtKXv6FJCO8XJwUOTmR-rh0t6rsOwsK';
const SCOPE='https://www.googleapis.com/auth/drive.file';
let tokenClient=null, accessToken='', folderId=localStorage.getItem('fazenda_gallery_folder')||'', objectUrls=[];
const TOKEN_KEY='fazenda_gallery_google_token', TOKEN_EXP_KEY='fazenda_gallery_google_token_exp';
function saveToken(token,expiresIn){ accessToken=token||''; if(accessToken){ sessionStorage.setItem(TOKEN_KEY,accessToken); sessionStorage.setItem(TOKEN_EXP_KEY,String(Date.now()+Math.max(60,Number(expiresIn||3600)-60)*1000)); } }
function restoreToken(){ const t=sessionStorage.getItem(TOKEN_KEY)||''; const exp=Number(sessionStorage.getItem(TOKEN_EXP_KEY)||0); if(t && exp>Date.now()){ accessToken=t; return true; } sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_EXP_KEY); return false; }
const $=id=>document.getElementById(id);
const status=(msg,warn=false)=>{ $('driveStatus').textContent=msg; $('driveStatus').className='drive-status'+(warn?' config-warning':''); };
const apiKeyReady=()=>API_KEY && !API_KEY.includes('COLE_AQUI');
function enableConnected(){ $('chooseFolder').disabled=!accessToken; $('refreshGallery').disabled=!(accessToken&&folderId); $('fileInput').disabled=!(accessToken&&folderId); $('uploadLabel').classList.toggle('disabled',!(accessToken&&folderId)); }
function waitForGoogle(){return new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.google?.accounts?.oauth2&&window.gapi){clearInterval(t);resolve()}else if(++n>200){clearInterval(t);reject(new Error('O Google não carregou. Confira a internet e atualize a página.'))}},100)})}
function connectionLost(message){accessToken='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_EXP_KEY);enableConnected();status(message||'A autorização do Google expirou. Toque em “Conectar Google Drive” para continuar.',true)}
async function init(){
  status('Preparando a conexão com o Google Drive...');
  try{
    await waitForGoogle();
    tokenClient=google.accounts.oauth2.initTokenClient({
      client_id:CLIENT_ID,scope:SCOPE,
      callback:r=>{
        if(r.error||!r.access_token){status('A autorização não foi concluída. Toque em “Conectar Google Drive” para tentar novamente.',true);return}
        saveToken(r.access_token,r.expires_in);enableConnected();
        status(folderId?'Google Drive conectado. Carregando a Galeria...':'Google Drive conectado. Agora toque em “Autorizar pasta Galeria”.');
        if(folderId)loadGallery();
      },
      error_callback:e=>status('A janela do Google foi fechada ou bloqueada. Abra o site diretamente no Chrome e tente conectar novamente.',true)
    });
    const restored=restoreToken();enableConnected();
    if(!apiKeyReady())status('Falta configurar a chave da API do Google Picker.',true);
    else if(restored){status(folderId?'Google Drive conectado. Sincronizando a Galeria...':'Google Drive conectado. Agora toque em “Autorizar pasta Galeria”.');if(folderId)loadGallery();}
    else status('Pronto para conectar. Toque em “Conectar Google Drive”. Se já autorizou antes, o Google pode pedir uma nova conexão após recarregar a página.');
  }catch(e){status(e.message,true)}
}
$('connectDrive').onclick=()=>{
  if(!tokenClient)return status('Aguarde o Google terminar de carregar. Se demorar, atualize a página.',true);
  status('Abrindo autorização do Google Drive...');
  try{tokenClient.requestAccessToken({prompt:accessToken?'':'select_account'})}
  catch(e){status('Não foi possível abrir o Google. Abra o site diretamente no Chrome. '+e.message,true)}
};
$('chooseFolder').onclick=()=>{
  if(!accessToken)return;
  if(!apiKeyReady())return status('Falta a chave da API do Google Picker. Configure-a antes de autorizar a pasta.',true);
  status('Abrindo o seletor de pastas do Google...');
  if(!window.google?.picker?.PickerBuilder)return status('O seletor de pastas ainda está carregando. Aguarde alguns segundos e tente novamente.',true);
  const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
  const picker=new google.picker.PickerBuilder().setAppId(APP_ID).setOAuthToken(accessToken).setDeveloperKey(API_KEY).addView(view).setTitle('Selecione a pasta Galeria').setCallback(data=>{
    if(data.action===google.picker.Action.PICKED&&data.docs?.[0]){
      const picked=data.docs[0].id;
      folderId=picked;localStorage.setItem('fazenda_gallery_folder',folderId);enableConnected();
      status(picked===EXPECTED_FOLDER_ID?'Pasta Galeria autorizada com sucesso.':'Pasta autorizada. Observação: ela é diferente da pasta Galeria configurada originalmente.',picked!==EXPECTED_FOLDER_ID);
      loadGallery();
    }else if(data.action===google.picker.Action.CANCEL){status('Seleção cancelada. Toque em “Autorizar pasta Galeria” quando quiser continuar.')}
  }).build();picker.setVisible(true);
};
async function driveFetch(url,options={}){const r=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+accessToken}});if(!r.ok){if(r.status===401){connectionLost();throw new Error('Autorização expirada. Conecte o Google Drive novamente.')}let m='Erro Google Drive ('+r.status+')';try{const j=await r.json();m=j.error?.message||m}catch{}throw new Error(m)}return r}
async function loadGallery(){
  if(!accessToken||!folderId)return;status('Carregando galeria...');objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];
  try{
    const q=encodeURIComponent(`'${folderId}' in parents and trashed=false`);const fields=encodeURIComponent('files(id,name,mimeType,size,createdTime,modifiedTime)');
    const r=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime%20desc&fields=${fields}&pageSize=100`);const data=await r.json();
    const files=(data.files||[]).filter(f=>f.mimeType?.startsWith('image/'));await render(files);$('galleryInfo').textContent=`${files.length} arquivo(s) na pasta Galeria.`;status('Galeria sincronizada com o Google Drive.');
  }catch(e){if(!accessToken)return;status('Não foi possível ler a pasta. Selecione-a novamente em “Autorizar pasta Galeria”. '+e.message,true)}
}
async function render(files){const grid=$('galleryGrid');grid.innerHTML='';if(!files.length){grid.innerHTML='<div class="gallery-empty"><div>📷</div><strong>A pasta está vazia</strong><p>Envie sua primeira foto ou GIF.</p></div>';return}
  for(const f of files){const card=document.createElement('article');card.className='gallery-card';const media=document.createElement('div');media.className='gallery-media';media.textContent='Carregando…';card.appendChild(media);const meta=document.createElement('div');meta.className='gallery-meta';const d=f.createdTime?new Date(f.createdTime).toLocaleDateString('pt-BR'):'';meta.innerHTML=`<strong title="${esc(f.name)}">${esc(f.name)}</strong><small>${d}</small>`;const del=document.createElement('button');del.textContent='🗑️ Excluir';del.onclick=()=>removeFile(f.id,f.name);meta.appendChild(del);card.appendChild(meta);grid.appendChild(card);
    driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}?alt=media`).then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);objectUrls.push(u);const img=new Image();img.alt=f.name;img.loading='lazy';img.src=u;media.textContent='';media.appendChild(img)}).catch(()=>{media.textContent='🖼️'});
  }
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('refreshGallery').onclick=loadGallery;
$('fileInput').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;for(const f of files){if(!f.type.startsWith('image/'))continue;try{status('Enviando '+f.name+'...');await upload(f)}catch(err){status('Falha ao enviar '+f.name+': '+err.message,true);e.target.value='';return}}e.target.value='';await loadGallery()};
async function upload(file){const meta={name:file.name,parents:[folderId]};const boundary='-------adminfazenda'+Date.now();const head=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${file.type||'application/octet-stream'}\r\n\r\n`;const tail=`\r\n--${boundary}--`;const body=new Blob([head,file,tail]);await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body})}
async function removeFile(id,name){if(!confirm(`Excluir “${name}” da Galeria e do Google Drive?`))return;try{status('Excluindo '+name+'...');await driveFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id),{method:'DELETE'});await loadGallery()}catch(e){status('Falha ao excluir: '+e.message,true)}}
enableConnected();init();
})();
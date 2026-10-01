/* AdminFazenda Firebase bridge v12
   Firestore is authoritative. Existing localStorage is a UI cache only.
   Every supported collection is hydrated BEFORE its page module starts, and every
   cache write is mirrored with an id-based Firestore reconciliation. */
(() => {
  'use strict';
  const firebaseConfig={apiKey:'AIzaSyABjx3tuGu-RUCsU54L98uii_O8p5xMEY8',authDomain:'adminfazenda.firebaseapp.com',projectId:'adminfazenda',storageBucket:'adminfazenda.firebasestorage.app',messagingSenderId:'12112211460',appId:'1:12112211460:web:2694671a6e0e9e6d954f51'};
  const MAP={fazenda_vendas:'vendas',fazenda_despesas:'despesas',fazenda_producao:'producao',fazenda_servicos:'servicos',fazenda_estoque_produtos:'estoque_produtos',fazenda_estoque_movimentos:'estoque_movimentos',fazenda_gado:'gado',fazenda_maquinas:'maquinas_transportes'};
  const appScript=document.currentScript?.dataset.app||'';
  const nativeSet=Storage.prototype.setItem,nativeGet=Storage.prototype.getItem;
  const queues=new Map(); let uid='',db=null,hydrating=false;
  const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  const arr=v=>{try{const x=JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const clean=o=>{const x={...o};delete x.ownerUid;delete x.updatedAt;return x};
  function status(t,bad=false){let e=document.getElementById('firebaseSyncStatus');if(!e){e=document.createElement('div');e.id='firebaseSyncStatus';e.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;padding:9px 12px;border-radius:9px;font:600 12px Arial;background:#fff;border:1px solid #d9e2dc;box-shadow:0 2px 12px #0002';document.body.appendChild(e)}e.textContent=t;e.style.color=bad?'#a00':'#176b43';if(!bad)setTimeout(()=>e?.remove(),1400)}
  async function readRemote(key){
    const snap=await db.collection(MAP[key]).where('ownerUid','==',uid).get();
    return snap.docs.map(d=>clean({...d.data(),id:d.id}));
  }
  async function reconcile(key,items){
    if(!db||!uid||!MAP[key])return [];
    // Snapshot the UI state now, so later mutations cannot change an in-flight sync.
    const normalized=JSON.parse(JSON.stringify((Array.isArray(items)?items:[]).map((o,i)=>({...o,id:String(o.id||('item-'+i))}))));
    const wanted=new Map(normalized.map(o=>[String(o.id),o]));
    const col=db.collection(MAP[key]);
    const snap=await col.where('ownerUid','==',uid).get();
    const owned=snap.docs;
    const ops=[];
    for(const d of owned) if(!wanted.has(String(d.id))) ops.push({type:'delete',ref:d.ref});
    for(const [id,o] of wanted) ops.push({type:'set',ref:col.doc(id),data:{...o,ownerUid:uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}});
    for(let i=0;i<ops.length;i+=300){
      const b=db.batch();
      for(const a of ops.slice(i,i+300)) a.type==='delete'?b.delete(a.ref):b.set(a.ref,a.data,{merge:false});
      await b.commit();
    }
    // Verify server state. If it differs, fail visibly instead of claiming success.
    const check=await col.where('ownerUid','==',uid).get();
    const ids=check.docs.map(d=>String(d.id)).sort();
    const wantIds=[...wanted.keys()].sort();
    if(JSON.stringify(ids)!==JSON.stringify(wantIds)) throw new Error('Verificação do Firestore falhou em '+MAP[key]);
    return normalized;
  }
  function sync(key,items){
    if(!MAP[key]||hydrating)return Promise.resolve();
    const snapshot=JSON.parse(JSON.stringify(Array.isArray(items)?items:[]));
    const prior=queues.get(key)||Promise.resolve();
    const next=prior.catch(()=>{}).then(()=>reconcile(key,snapshot)).then(()=>status('Firebase atualizado')).catch(e=>{console.error('Firebase sync',key,e);status('ERRO: Firebase não atualizou',true);throw e});
    queues.set(key,next); return next;
  }
  async function hydrate(){
    hydrating=true;
    try{
      // V11: read all Firestore collections in parallel. The old V10 waited for
      // eight network queries one after another before starting the page.
      const keys=Object.keys(MAP);
      const results=await Promise.all(keys.map(async key=>[key,await readRemote(key)]));
      for(const [key,remote] of results) nativeSet.call(localStorage,key,JSON.stringify(remote));
    }finally{hydrating=false}
  }
  async function clearOperationalData(){
    if(!db||!uid) throw new Error('Firebase não inicializado');
    status('Limpando dados do Firebase...');
    // Wait for any previous write before destructive maintenance.
    await Promise.allSettled([...queues.values()]);
    for(const key of Object.keys(MAP)){
      const col=db.collection(MAP[key]);
      const snap=await col.where('ownerUid','==',uid).get();
      for(let i=0;i<snap.docs.length;i+=300){
        const b=db.batch();
        snap.docs.slice(i,i+300).forEach(d=>b.delete(d.ref));
        await b.commit();
      }
      nativeSet.call(localStorage,key,'[]');
    }
    // Verify every operational collection is empty for this user.
    for(const key of Object.keys(MAP)){
      const check=await db.collection(MAP[key]).where('ownerUid','==',uid).limit(1).get();
      if(!check.empty) throw new Error('Não foi possível limpar '+MAP[key]);
    }
    status('Banco operacional limpo');
    return true;
  }
  function patchStorage(){
    if(window.__AFpatched)return;
    Storage.prototype.setItem=function(key,value){nativeSet.call(this,key,value);};
    window.__AFpatched=true;
  }
  function addLogout(){const top=document.querySelector('.topbar');if(!top||document.getElementById('firebaseLogout'))return;const b=document.createElement('button');b.id='firebaseLogout';b.type='button';b.textContent='Sair';b.style.cssText='margin-left:auto;padding:9px 14px;border:1px solid #d9e2dc;border-radius:10px;background:#fff;cursor:pointer;font-weight:700';b.onclick=()=>window.AdminFazendaLogout();top.appendChild(b)}
  async function boot(){
    try{
      await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');await Promise.all([load('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js'),load('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js')]);
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);const auth=firebase.auth();db=firebase.firestore();
      auth.onAuthStateChanged(async user=>{if(!user){location.replace('login.html');return}uid=user.uid;window.AdminFazendaUser=user;window.AdminFazendaDB=db;
        patchStorage();
        window.AdminFazendaSync=(key,items)=>sync(key,items);
        window.AdminFazendaSaveItem=async(key,item)=>{
          if(!MAP[key]||!item||!item.id) throw new Error('Dados inválidos para gravação');
          const ref=db.collection(MAP[key]).doc(String(item.id));
          const data={...JSON.parse(JSON.stringify(item)),ownerUid:uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
          await ref.set(data,{merge:false});
          const check=await ref.get();
          if(!check.exists||check.data().ownerUid!==uid) throw new Error('Firestore não confirmou a gravação');
          return clean({...check.data(),id:check.id});
        };
        window.AdminFazendaDeleteItem=async(key,id)=>{
          if(!MAP[key]||!id) throw new Error('Dados inválidos para exclusão');
          const ref=db.collection(MAP[key]).doc(String(id));
          await ref.delete();
          const check=await ref.get();
          if(check.exists) throw new Error('Firestore não confirmou a exclusão');
          return true;
        };
        window.AdminFazendaReload=async key=>{const x=await readRemote(key);nativeSet.call(localStorage,key,JSON.stringify(x));return x};
        window.AdminFazendaFlush=()=>Promise.allSettled([...queues.values()]);
        window.AdminFazendaClearOperationalData=clearOperationalData;
        window.AdminFazendaLogout=async()=>{await window.AdminFazendaFlush();await auth.signOut();location.replace('login.html')};
        addLogout();
        const isDashboard=/\/app\.js$/i.test(appScript)||appScript==='Js/app.js';
        const loadApp=()=>{if(!appScript||window.__AFappLoaded)return;window.__AFappLoaded=true;const s=document.createElement('script');s.src=appScript+'?v=12';document.body.appendChild(s)};
        if(isDashboard){
          // V12 cache-first: paint the dashboard from the last verified Firestore cache immediately.
          // Refresh all collections in parallel in the background, then repaint with authoritative data.
          loadApp();
          try{await hydrate();window.dispatchEvent(new CustomEvent('adminfazenda:dataready'))}catch(e){console.error('Atualização do dashboard',e);status('Usando dados salvos; Firebase indisponível',true)}
        }else{
          // Data-entry pages still wait for Firestore, preventing edits against stale cache.
          await hydrate();loadApp();
        }
      });
    }catch(e){console.error(e);alert('Falha ao conectar ao Firebase. Verifique a internet e recarregue a página.')}
  }
  boot();
})();

(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyABjx3tuGu-RUCsU54L98uii_O8p5xMEY8",
    authDomain: "adminfazenda.firebaseapp.com",
    projectId: "adminfazenda",
    storageBucket: "adminfazenda.firebasestorage.app",
    messagingSenderId: "12112211460",
    appId: "1:12112211460:web:2694671a6e0e9e6d954f51"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const DATA_KEYS = ["fazenda_vendas","fazenda_despesas","fazenda_producao","fazenda_servicos","fazenda_estoque_produtos","fazenda_estoque_movimentos","fazenda_gado"];
  let syncing = false;
  let saveTimer = null;
  const nativeSetItem = localStorage.setItem.bind(localStorage);
  const nativeRemoveItem = localStorage.removeItem.bind(localStorage);

  async function saveCloud() {
    if (syncing || !auth.currentUser) return;
    const data = {};
    for (const key of DATA_KEYS) {
      try { data[key] = JSON.parse(localStorage.getItem(key) || "[]"); }
      catch { data[key] = []; }
    }
    await db.collection("usuarios").doc(auth.currentUser.uid).set({data, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
  }
  function queueSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>saveCloud().catch(e=>console.error("Falha ao sincronizar:",e)),250); }
  localStorage.setItem = function(k,v){ nativeSetItem(k,v); if(DATA_KEYS.includes(k)) queueSave(); };
  localStorage.removeItem = function(k){ nativeRemoveItem(k); if(DATA_KEYS.includes(k)) queueSave(); };

  function addLogout(){
    const b=document.createElement("button"); b.textContent="Sair"; b.title="Sair do sistema";
    b.style.cssText="position:fixed;right:14px;bottom:14px;z-index:9999;padding:9px 14px;border:0;border-radius:10px;background:#7a2e2e;color:white;font-weight:700;box-shadow:0 2px 10px #0003;cursor:pointer";
    b.onclick=()=>auth.signOut(); document.body.appendChild(b);
  }
  function loadPageScript(){
    const src=document.currentScript && document.currentScript.dataset.appScript;
    if(src){ const s=document.createElement("script"); s.src=src; document.body.appendChild(s); }
  }

  auth.onAuthStateChanged(async user => {
    if(!user){ location.replace("login.html"); return; }
    try {
      syncing=true;
      const ref=db.collection("usuarios").doc(user.uid);
      const snap=await ref.get();
      if(snap.exists && snap.data().data){
        const cloud=snap.data().data;
        DATA_KEYS.forEach(k=>nativeSetItem(k,JSON.stringify(Array.isArray(cloud[k])?cloud[k]:[])));
      } else {
        const data={}; DATA_KEYS.forEach(k=>{try{data[k]=JSON.parse(localStorage.getItem(k)||"[]")}catch{data[k]=[]}});
        await ref.set({email:user.email||"",data,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      }
    } catch(e){
      console.error(e); alert("Não foi possível sincronizar com o Firebase. Verifique a internet e tente novamente.");
    } finally {
      syncing=false; document.documentElement.style.visibility="visible"; addLogout(); loadPageScript();
    }
  });
})();

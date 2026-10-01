const BACKUP_KEYS=["fazenda_vendas","fazenda_despesas","fazenda_producao","fazenda_servicos","fazenda_estoque_produtos","fazenda_estoque_movimentos","fazenda_gado","fazenda_maquinas"];
const LABELS={fazenda_vendas:"Vendas",fazenda_despesas:"Despesas",fazenda_producao:"Produções",fazenda_servicos:"Serviços",fazenda_estoque_produtos:"Produtos em estoque",fazenda_estoque_movimentos:"Movimentações",fazenda_gado:"Animais",fazenda_maquinas:"Máquinas e transportes"};
const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return[]}};
function summary(){document.getElementById("dataSummary").innerHTML=BACKUP_KEYS.map(k=>`<div class="summary-item"><span>${LABELS[k]}</span><strong>${read(k).length}</strong></div>`).join("")}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`}
document.getElementById("downloadBackup").onclick=()=>{const data={app:"Minha Fazenda",backupVersion:1,createdAt:new Date().toISOString(),data:{}};BACKUP_KEYS.forEach(k=>data.data[k]=read(k));const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`minha-fazenda-backup_${stamp()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href)};
const file=document.getElementById("backupFile");file.onchange=()=>document.getElementById("selectedFile").textContent=file.files[0]?`Selecionado: ${file.files[0].name}`:"Nenhum arquivo selecionado.";
document.getElementById("restoreBackup").onclick=async()=>{const f=file.files[0];if(!f)return alert("Selecione primeiro um arquivo de backup .json.");let b;try{b=JSON.parse(await f.text())}catch{return alert("O arquivo selecionado não é um JSON válido.")}if(!b||b.app!=="Minha Fazenda"||!b.data||typeof b.data!=="object")return alert("Este arquivo não é um backup válido do sistema Minha Fazenda.");for(const k of BACKUP_KEYS)if(!Array.isArray(b.data[k]))return alert(`Backup inválido: dados de ${LABELS[k]} ausentes ou incorretos.`);if(!confirm("ATENÇÃO: a restauração substituirá todos os dados atuais deste navegador. Deseja continuar?"))return;BACKUP_KEYS.forEach(k=>{localStorage.setItem(k,JSON.stringify(b.data[k]));if(window.AdminFazendaSync)window.AdminFazendaSync(k,b.data[k])});summary();file.value="";document.getElementById("selectedFile").textContent="Nenhum arquivo selecionado.";alert("Backup restaurado com sucesso. O sistema já está usando os dados restaurados.")};summary();

const clearBtn=document.getElementById("clearDatabase");
if(clearBtn) clearBtn.onclick=async()=>{
  const typed=prompt('ATENÇÃO: isto apagará Gado, Vendas, Despesas, Produção, Serviços e Estoque do Firebase.\n\nSeu usuário/login NÃO será apagado.\n\nDigite APAGAR para confirmar:');
  if(typed!=="APAGAR") return alert("Limpeza cancelada.");
  if(!confirm("Última confirmação: apagar todos os dados operacionais do sistema?")) return;
  clearBtn.disabled=true; clearBtn.textContent="Limpando...";
  try{
    if(!window.AdminFazendaClearOperationalData) throw new Error("Conexão Firebase indisponível");
    await window.AdminFazendaClearOperationalData();
    summary();
    alert("Dados operacionais apagados do Firebase e do cache deste navegador. Seu login foi preservado.");
    location.reload();
  }catch(e){
    console.error(e);
    alert("Não foi possível concluir a limpeza. Nenhum sucesso foi assumido. Verifique a internet e tente novamente.");
  }finally{clearBtn.disabled=false;clearBtn.textContent="🗑️ Limpar dados do sistema"}
};

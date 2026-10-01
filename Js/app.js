// Dashboard integrado aos módulos do sistema.
function iniciarDashboard(){
 const $=id=>document.getElementById(id), get=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}};
 const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const esc=t=>{let d=document.createElement("div");d.textContent=t??"";return d.innerHTML};
 const dateBR=v=>v?new Date(v+"T00:00:00").toLocaleDateString("pt-BR"):"-";
 const sum=(a,f)=>a.reduce((n,x)=>n+Number(f(x)||0),0);
 const now=new Date(), monthStart=new Date(now.getFullYear(),now.getMonth(),1), yearStart=new Date(now.getFullYear(),0,1);
 const iso=d=>{let x=new Date(d),o=x.getTimezoneOffset();return new Date(x-o*60000).toISOString().slice(0,10)};
 const sales=get("fazenda_vendas"), expenses=get("fazenda_despesas"), services=get("fazenda_servicos"), productions=get("fazenda_producao"), stock=get("fazenda_estoque_produtos"), cattle=get("fazenda_gado"), machines=get("fazenda_maquinas"), stockMoves=get("fazenda_estoque_movimentos");
 const thisMonth=x=>x.date>=iso(monthStart)&&x.date<=iso(now);
 const sm=sales.filter(thisMonth),pm=productions.filter(thisMonth),active=cattle.filter(x=>x.status==="Ativo");
 $("dashSales").textContent=money(sum(sm,x=>x.total ?? Number(x.quantity||0)*Number(x.unitPrice||0)));
 $("dashSalesCount").textContent=`${sm.length} ${sm.length===1?"venda":"vendas"} no mês`;
 $("dashStock").textContent=stock.length;
 $("dashStockLow").textContent=`${stock.filter(x=>Number(x.quantity)<=Number(x.minimum)).length} com estoque baixo`;
 const unitCount=x=>["Peixes","Ovos"].includes(x.category)?Number(x.quantity||0):1;
 const animalTotal=active.filter(x=>x.category!=="Ovos").reduce((n,x)=>n+unitCount(x),0);
 $("dashCattle").textContent=animalTotal;
 $("dashProduction").textContent=pm.length;
 $("dashProductionQty").textContent=`${sum(pm,x=>x.quantity).toLocaleString("pt-BR")} produzidos`;
 const countCat=c=>active.filter(x=>x.category===c).reduce((n,x)=>n+unitCount(x),0);
 $("cowCount").textContent=countCat("Vaca"); $("calvedCowCount").textContent=active.filter(x=>x.category==="Vaca"&&x.isCalved).length; $("dairyCowCount").textContent=active.filter(x=>x.category==="Vaca"&&x.isDairy).length;
 $("bullCount").textContent=countCat("Touro"); $("oxCount").textContent=countCat("Boi"); $("calfCount").textContent=countCat("Bezerro"); $("heiferCount").textContent=countCat("Bezerra"); $("horseCount").textContent=countCat("Cavalo"); $("mareCount").textContent=countCat("Égua"); $("duckCount").textContent=countCat("Pato"); $("femaleDuckCount").textContent=countCat("Pata"); $("henCount").textContent=countCat("Galinha"); $("roosterCount").textContent=countCat("Galo"); $("guineaCount").textContent=countCat("Galinha-d'Angola"); $("fishCount").textContent=countCat("Peixes"); $("eggCount").textContent=countCat("Ovos");
 const activeMachines=machines.filter(x=>x.status!=="Vendido/Baixado"), mc=t=>activeMachines.filter(x=>x.type===t).length;
 $("tractorCount").textContent=mc("Trator"); $("motorcycleCount").textContent=mc("Moto"); $("quadCount").textContent=mc("Quadriciclo"); $("bikeCount").textContent=mc("Bicicleta"); $("cartCount").textContent=mc("Carroça"); $("wheelbarrowCount").textContent=mc("Carrinho de mão");

 function finance(){
   let type=$("financePeriod").value,start=monthStart;
   if(type==="3months") start=new Date(now.getFullYear(),now.getMonth()-2,1);
   if(type==="year") start=yearStart;
   let s=iso(start),e=iso(now),inside=x=>x.date>=s&&x.date<=e;
   let ss=sales.filter(inside),dd=expenses.filter(inside),sv=services.filter(inside);
   let saleRevenue=sum(ss,x=>x.total ?? Number(x.quantity||0)*Number(x.unitPrice||0));
   let provided=sum(sv.filter(x=>x.direction==="Prestado"),x=>x.value);
   let hired=sum(sv.filter(x=>x.direction==="Contratado"),x=>x.value);
   let exp=sum(dd,x=>x.total);
   let revenue=saleRevenue+provided,out=exp+hired;
   $("dashRevenue").textContent=money(revenue);$("dashExpenses").textContent=money(out);$("dashBalance").textContent=money(revenue-out);
 }
 if(!$("financePeriod").dataset.bound){$("financePeriod").addEventListener("change",finance);$("financePeriod").dataset.bound="1";} finance();

 let recent=[];
 sales.forEach(x=>recent.push({date:x.date,kind:"💰 Venda",desc:`${x.customer||"-"} • ${x.product||"-"}`,value:money(x.total ?? Number(x.quantity||0)*Number(x.unitPrice||0))}));
 expenses.forEach(x=>recent.push({date:x.date,kind:"🧾 Despesa",desc:`${x.item||"-"} • ${x.supplier||"-"}`,value:"-"+money(x.total)}));
 services.forEach(x=>recent.push({date:x.date,kind:"🔧 Serviço",desc:`${x.name||"-"} • ${x.direction==="Prestado"?"Prestado":"Contratado"}`,value:(x.direction==="Prestado"?"+":"-")+money(x.value)}));
 productions.forEach(x=>recent.push({date:x.date,kind:"🏭 Produção",desc:`${x.product||"-"} • ${Number(x.quantity||0).toLocaleString("pt-BR")} ${x.unit||""}`,value:"Entrada no estoque"}));
 stockMoves.filter(x=>!x.source).forEach(x=>recent.push({date:x.date,kind:"📦 Estoque",desc:`${x.productName||"-"} • ${x.type||""}`,value:`${Number(x.quantity||0).toLocaleString("pt-BR")} ${x.unit||""}`}));
 recent.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 let box=$("recentMovements");
 if(recent.length){
   box.className="dashboard-movements";
   box.innerHTML=recent.slice(0,8).map(x=>`<div class="dashboard-movement"><div><strong>${x.kind}</strong><span>${esc(x.desc)}</span></div><div><strong>${esc(x.value)}</strong><span>${dateBR(x.date)}</span></div></div>`).join("");
 }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciarDashboard,{once:true}); else iniciarDashboard();
window.addEventListener("adminfazenda:dataready", iniciarDashboard);

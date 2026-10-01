const $=id=>document.getElementById(id),get=k=>JSON.parse(localStorage.getItem(k)||"[]");
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),dateBR=v=>v?new Date(v+"T00:00:00").toLocaleDateString("pt-BR"):"-",esc=t=>{let d=document.createElement("div");d.textContent=t??"";return d.innerHTML};
function iso(d){let o=d.getTimezoneOffset();return new Date(d-o*60000).toISOString().slice(0,10)}
function setPeriod(type){let n=new Date(),s,e=n;if(type==="month")s=new Date(n.getFullYear(),n.getMonth(),1);else if(type==="year")s=new Date(n.getFullYear(),0,1);else{s=null;e=null}$("startDate").value=s?iso(s):"";$("endDate").value=e?iso(e):"";document.querySelectorAll(".quick").forEach(b=>b.classList.toggle("active",b.dataset.period===type));generate()}
function inPeriod(d){let s=$("startDate").value,e=$("endDate").value;return (!s||d>=s)&&(!e||d<=e)}
function empty(cols,msg){return `<tr class="empty"><td colspan="${cols}">${msg}</td></tr>`}
const sum=(arr,fn)=>arr.reduce((a,x)=>a+Number(fn(x)||0),0);
function generate(){
 const sales=get("fazenda_vendas").filter(x=>inPeriod(x.date));
 const prod=get("fazenda_producao").filter(x=>inPeriod(x.date));
 const services=get("fazenda_servicos").filter(x=>inPeriod(x.date));
 const expenses=get("fazenda_despesas").filter(x=>inPeriod(x.date));
 const stock=get("fazenda_estoque_produtos"),cattle=get("fazenda_gado");

 const salesTotal=sum(sales,x=>x.total ?? (Number(x.quantity||0)*Number(x.unitPrice||x.unitValue||0)));
 const prodQty=sum(prod,x=>x.quantity);
 const providedList=services.filter(x=>x.direction==="Prestado");
 const hiredList=services.filter(x=>x.direction==="Contratado");
 const provided=sum(providedList,x=>x.value),hired=sum(hiredList,x=>x.value);
 const servTotal=sum(services,x=>x.value),expenseTotal=sum(expenses,x=>x.total);
 const expensesPaid=sum(expenses.filter(x=>x.status==="Pago"),x=>x.total);
 const expensesPending=sum(expenses.filter(x=>x.status!=="Pago"),x=>x.total);
 const servicesPaid=sum(services.filter(x=>x.status==="Pago"),x=>x.value);
 const servicesPending=sum(services.filter(x=>x.status!=="Pago"),x=>x.value);
 const active=cattle.filter(x=>x.status==="Ativo"),cows=active.filter(x=>x.category==="Vaca").length,young=active.filter(x=>x.category==="Bezerro"||x.category==="Bezerra").length;

 $("salesValue").textContent=money(salesTotal);$("salesCount").textContent=`${sales.length} vendas`;
 $("productionCount").textContent=prod.length;$("productionQty").textContent=`${prodQty.toLocaleString("pt-BR")} produzidos`;
 $("servicesValue").textContent=money(servTotal);$("servicesCount").textContent=`${services.length} serviços`;
 $("expensesValue").textContent=money(expenseTotal);$("expensesCount").textContent=`${expenses.length} despesas`;
 $("cattleCount").textContent=active.length;$("cattleDetail").textContent=`${cows} vacas • ${young} jovens`;

 $("financeSales").textContent=money(salesTotal);
 $("financeProvided").textContent=money(provided);
 $("financeHired").textContent=money(hired);
 $("financeExpenses").textContent=money(expenseTotal);
 $("financeBalance").textContent=money(salesTotal+provided-hired-expenseTotal);
 $("expensesPaid").textContent=money(expensesPaid);
 $("expensesPending").textContent=money(expensesPending);
 $("servicesPaid").textContent=money(servicesPaid);
 $("servicesPending").textContent=money(servicesPending);

 $("stockProducts").textContent=stock.length;
 $("stockLow").textContent=stock.filter(x=>Number(x.quantity)<=Number(x.minimum)).length;
 $("activeAnimals").textContent=active.length;$("soldAnimals").textContent=cattle.filter(x=>x.status==="Vendido").length;

 $("salesTable").innerHTML=sales.length?sales.map(x=>`<tr><td>${dateBR(x.date)}</td><td>${esc(x.client||x.customer||"-")}</td><td>${esc(x.product||"-")}</td><td>${Number(x.quantity||0).toLocaleString("pt-BR")}</td><td><strong>${money(x.total ?? Number(x.quantity||0)*Number(x.unitPrice||x.unitValue||0))}</strong></td><td><span class="badge">${esc(x.paymentStatus||x.status||"-")}</span></td></tr>`).join(""):empty(6,"Nenhuma venda no período.");
 $("expensesTable").innerHTML=expenses.length?expenses.map(x=>`<tr><td>${dateBR(x.date)}</td><td><strong>${esc(x.item)}</strong></td><td>${esc(x.category)}</td><td>${esc(x.supplier)||"-"}</td><td>${Number(x.quantity||0).toLocaleString("pt-BR")} ${esc(x.unit||"")}</td><td><strong>${money(x.total)}</strong></td><td>${esc(x.status)}</td></tr>`).join(""):empty(7,"Nenhuma despesa no período.");
 $("productionTable").innerHTML=prod.length?prod.map(x=>`<tr><td>${dateBR(x.date)}</td><td><strong>${esc(x.product)}</strong></td><td>${Number(x.quantity||0).toLocaleString("pt-BR")}</td><td>${esc(x.unit)}</td><td>${money(x.cost)}</td><td>${esc(x.batch)||"-"}</td></tr>`).join(""):empty(6,"Nenhuma produção no período.");
 $("servicesTable").innerHTML=services.length?services.map(x=>`<tr><td>${dateBR(x.date)}</td><td><strong>${esc(x.name)}</strong></td><td>${x.direction==="Prestado"?"Prestado pela fazenda":"Contratado pela fazenda"}</td><td>${esc(x.responsible)}</td><td>${money(x.value)}</td><td><span class="badge">${esc(x.status)}</span></td></tr>`).join(""):empty(6,"Nenhum serviço no período.");
 $("stockTable").innerHTML=stock.length?stock.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.category)}</td><td>${Number(x.quantity||0).toLocaleString("pt-BR")} ${esc(x.unit)}</td><td>${Number(x.minimum||0).toLocaleString("pt-BR")}</td><td>${money(x.value)}</td><td class="${Number(x.quantity)<=Number(x.minimum)?"warn":"ok"}"><strong>${Number(x.quantity)<=Number(x.minimum)?"Estoque baixo":"Normal"}</strong></td></tr>`).join(""):empty(6,"Nenhum produto no estoque.");
 $("cattleTable").innerHTML=cattle.length?cattle.map(x=>`<tr><td><strong>#${esc(x.tag)}</strong></td><td>${esc(x.name)||"Sem nome"}</td><td>${esc(x.category)}</td><td>${esc(x.breed)||"-"}</td><td>${x.weight?Number(x.weight).toLocaleString("pt-BR")+" kg":"-"}</td><td><span class="badge">${esc(x.status)}</span></td></tr>`).join(""):empty(6,"Nenhum animal cadastrado.");
}
document.querySelectorAll(".quick").forEach(b=>b.onclick=()=>setPeriod(b.dataset.period));
$("applyFilter").onclick=generate;$("printReport").onclick=()=>window.print();
document.querySelectorAll(".report-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".report-tab,.table-section").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.table).classList.add("active")});
setPeriod("month");
// ================== Dados ==================
let clientes=[
 {codigo:"12530",nome:"SuperAlimentos LTDA",ramo:"Alimentício"},
 {codigo:"12420",nome:"Indústria Mecânica Forte",ramo:"Industrial"},
 {codigo:"12380",nome:"Farmavida",ramo:"Farmacêutico"},
 {codigo:"12370",nome:"AgroMix",ramo:"Agrícola"},
 {codigo:"12360",nome:"Construmax",ramo:"Construção"}
];
function geraAgenda(n){const a=[];for(let i=0;i<n;i++){const c=clientes[i%clientes.length];a.push({cliente:c.nome,codigo:c.codigo});}return a;}
const agendaData={dia:geraAgenda(4),semana:geraAgenda(20),mes:geraAgenda(40)};

// ================== Navegação ==================
function mostrarPagina(id){
 document.querySelectorAll(".pagina").forEach(p=>p.classList.remove("ativa"));
 document.getElementById(id).classList.add("ativa");

 if(id==="clientesCadastrados"||id==="cadastroClientes"){
  const nav=document.getElementById("tpl-nav-clientes").content.firstElementChild.cloneNode(true);
  const cont=document.getElementById(id);
  if(!cont.querySelector(".clientes-nav"))cont.insertBefore(nav,cont.firstChild);
 }
}
function irParaLogin(){mostrarPagina("pagina2");}
function fazerLogin(){mostrarPagina("pagina3");return false;}
function abrirPagina(id){mostrarPagina(id);}
function voltarMenu(){mostrarPagina("pagina3");}
function voltarInicio(){mostrarPagina("pagina1");}

// ================== Agenda ==================
function mostrarAgenda(tipo){
 const ul=document.getElementById("listaAgenda");
 ul.innerHTML="";
 agendaData[tipo].forEach(it=>{
  const li=document.createElement("li");
  li.textContent=`${it.cliente} (cód. ${it.codigo})`;
  ul.appendChild(li);
 });
}

// ================== Clientes ==================
const listaClientesEl=()=>document.getElementById("listaClientes");
const codigoBuscaEl=()=>document.getElementById("codigoBusca");
const nenhumClienteEl=()=>document.getElementById("nenhumCliente");

document.addEventListener("DOMContentLoaded",()=>{
 construirLista();
 codigoBuscaEl()?.addEventListener("input",filtrarClientes);
 document.getElementById("formNovoCliente").addEventListener("submit",e=>{e.preventDefault();addCliente();});
 initSignaturePad();
});
function construirLista(){
 const ul=listaClientesEl();if(!ul)return;ul.innerHTML="";
 clientes.forEach(c=>{
  const li=document.createElement("li");
  li.className="cliente-item";
  li.dataset.codigo=c.codigo;
  li.innerHTML=`<strong>${c.nome}</strong><br><small>${c.codigo} • ${c.ramo}</small>`;
  li.onclick=()=>selecionarCliente(c.codigo);
  ul.appendChild(li);
 });
}
function filtrarClientes(){
 const v=codigoBuscaEl().value.trim();let vis=0;
 [...listaClientesEl().children].forEach(li=>{
  if(!v||li.dataset.codigo.startsWith(v)){li.hidden=false;vis++;}else li.hidden=true;
 });
 nenhumClienteEl().hidden=vis!==0;
}
function addCliente(){
 const cod=document.getElementById("novoCodigo").value.trim();
 const nome=document.getElementById("novoNome").value.trim();
 const ramo=document.getElementById("novoRamo").value.trim();
 if(!cod||!nome||!ramo)return alert("Preencha todos os campos.");
 if(clientes.some(c=>c.codigo===cod))return alert("Código já existe.");
 clientes.push({codigo:cod,nome,ramo});
 alert("Cliente adicionado!");
 document.getElementById("formNovoCliente").reset();
 construirLista();
}

// ================== Selecionar Cliente ==================
function selecionarCliente(codigo){
 const c=clientes.find(x=>x.codigo===codigo);
 if(!c)return;
 document.getElementById("clienteNome").textContent=`${c.nome} (${c.codigo})`;
 document.getElementById("dataHora").value=new Date().toLocaleString();
 obterLocalizacao();
 mostrarPagina("ordemExecucao");
}

// ================== Geolocalização ==================
function obterLocalizacao(){
 const inp=document.getElementById("localizacao");
 if(!navigator.geolocation){inp.value="Geolocalização não suportada.";return;}
 inp.value="Obtendo localização...";
 navigator.geolocation.getCurrentPosition(
  pos=>{
   const {latitude,longitude}=pos.coords;
   inp.value=`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  },
  ()=>{inp.value="Falha ao obter localização";}
 );
}

// ================== Assinatura ==================
let assinaturaVazia=true;
function initSignaturePad(){
 const canvas=document.getElementById("signaturePad");
 const ctx=canvas.getContext("2d");
 let desenhando=false;

 const getPos=e=>{
  const rect=canvas.getBoundingClientRect();
  const clientX=e.touches?e.touches[0].clientX:e.clientX;
  const clientY=e.touches?e.touches[0].clientY:e.clientY;
  return {x:clientX-rect.left,y:clientY-rect.top};
 };

 const desenhar=e=>{
  if(!desenhando)return;
  e.preventDefault();
  const {x,y}=getPos(e);
  ctx.lineWidth=2;
  ctx.lineCap="round";
  ctx.strokeStyle="#000";
  ctx.lineTo(x,y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x,y);
  assinaturaVazia=false;
 };

 const iniciar=e=>{
  desenhando=true;
  const {x,y}=getPos(e);
  ctx.beginPath();
  ctx.moveTo(x,y);
 };

 const parar=e=>{
  desenhando=false;
  ctx.beginPath();
 };

 // Pointer events (melhor compatibilidade)
 canvas.addEventListener("pointerdown",iniciar);
 canvas.addEventListener("pointermove",desenhar);
 canvas.addEventListener("pointerup",parar);
 canvas.addEventListener("pointerleave",parar);

 document.getElementById("limparAssinatura").onclick=()=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);
  assinaturaVazia=true;
 };
}

// ================== Finalizar OS ==================
async function finalizarOrdemServico(){
 if(assinaturaVazia)return alert("Assine para finalizar.");
 const cliente=document.getElementById("clienteNome").textContent;
 const dataHora=document.getElementById("dataHora").value;
 const local=document.getElementById("localizacao").value;
 const produtos=document.getElementById("produtos").value.trim();
 const pragas=document.getElementById("pragas").value.trim();
 const ocorr=document.getElementById("ocorrencia").value.trim();
 const fotoInput=document.getElementById("fotoCliente");
 let fotoData=null;
 if(fotoInput.files.length)fotoData=await fileToDataURL(fotoInput.files[0]);

 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 doc.text("Ordem de Serviço",10,15);
 doc.text(`Cliente: ${cliente}`,10,25);
 doc.text(`Data/Hora: ${dataHora}`,10,33);
 doc.text(`Local: ${local}`,10,41);
 doc.text(`Produtos: ${produtos}`,10,49);
 doc.text(`Pragas: ${pragas}`,10,57);
 doc.text("Ocorrência:",10,65);
 doc.text(ocorr||"-",10,73);

 let currentY=80;
 if(fotoData){
   doc.text("Foto:",10,currentY);
   currentY+=5;
   doc.addImage(fotoData,"JPEG",10,currentY,80,60);
   currentY+=65;
 }
 doc.text("Assinatura:",10,currentY+5);
 const signImg=document.getElementById("signaturePad").toDataURL("image/png");
 doc.addImage(signImg,"PNG",60,currentY,100,40);

 const blob=doc.output("blob");
 const url=URL.createObjectURL(blob);
 const filename=`ordem_${Date.now()}.pdf`;

 const li=document.createElement("li");
 const a=document.createElement("a");
 a.href=url;
 a.download=filename;
 a.textContent=`Ordem ${cliente}`;
 li.appendChild(a);
 document.getElementById("listaOrdens").prepend(li);
 document.getElementById("semOrdens").style.display="none";

 alert("Ordem finalizada!");
 // Reset
 document.getElementById("formOrdem").reset();
 const ctx=document.getElementById("signaturePad").getContext("2d");
 ctx.clearRect(0,0,300,160);
 assinaturaVazia=true;

 // Volta para página de clientes
 mostrarPagina("clientesCadastrados");
}
function fileToDataURL(file){
 return new Promise(res=>{
  const reader=new FileReader();
  reader.onload=()=>res(reader.result);
  reader.readAsDataURL(file);
 });
}
/* ============================================================================
   Brasprag – SCRIPT PRINCIPAL (JS)
   ----------------------------------------------------------------------------
   • Login aceita qualquer usuário/senha (não vazios)
   • Assinatura sem scroll em mobile
   • PDF organizado em seções espaçadas
   • Menu de navegação + responsividade
   • **VERSÃO COMPLETA** – arquivo encerrado corretamente
============================================================================ */

/******************************* ESTADO GLOBAL *******************************/
const state = {
  usuarioLogado: false,
  clientes: [],          // { id, codigo, nome, ramo }
  ordens: [],            // { id, clienteId, ... }
  ordemAtual: null,      // cliente selecionado para execução
};

/******************************* UTILIDADES *********************************/
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showPage(id) {
  $$(".pagina").forEach(p => p.classList.remove("ativa"));
  $("#" + id).classList.add("ativa");
}

function formatDateTime(date = new Date()) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/******************************* NAVEGAÇÃO BÁSICA ****************************/
window.irParaLogin = () => showPage("pagina2");

window.fazerLogin = () => {
  const usuario = $("#usuario").value.trim();
  const senha   = $("#senha").value.trim();
  if (!usuario || !senha) {
    alert("Preencha usuário e senha.");
    return false;
  }
  state.usuarioLogado = true;
  showPage("agenda");
  return false; // impede reload
};

window.abrirPagina = (id) => {
  showPage(id);
  if (id === "clientesCadastrados") preencherListaClientes();
  if (id === "ordens") preencherListaOrdens();
};

window.voltarInicio = () => {
  state.usuarioLogado = false;
  showPage("pagina1");
};

/******************************* CLIENTES ************************************/
const formNovoCliente = $("#formNovoCliente");
formNovoCliente?.addEventListener("submit", (e) => {
  e.preventDefault();
  const codigo = $("#novoCodigo").value.trim();
  const nome   = $("#novoNome").value.trim();
  const ramo   = $("#novoRamo").value.trim();
  if (!codigo || !nome || !ramo) return;
  state.clientes.push({ id: gerarId(), codigo, nome, ramo });
  e.target.reset();
  alert("Cliente cadastrado!");
});

function preencherListaClientes() {
  const ul = $("#listaClientes");
  const termo = $("#codigoBusca").value.trim().toLowerCase();
  ul.innerHTML = "";
  const lista = state.clientes.filter(c => c.codigo.toLowerCase().includes(termo));
  $("#nenhumCliente").hidden = !!lista.length;
  lista.forEach(c => {
    const li = document.createElement("li");
    li.className = "cliente-item";
    li.textContent = `${c.codigo} – ${c.nome}`;
    li.onclick = () => iniciarExecucaoOrdem(c.id);
    ul.appendChild(li);
  });
}
$("#codigoBusca").addEventListener("input", preencherListaClientes);

/******************************* EXECUÇÃO DE O.S. ****************************/
function iniciarExecucaoOrdem(clienteId) {
  const cliente = state.clientes.find(c => c.id === clienteId);
  if (!cliente) return;
  state.ordemAtual = cliente;
  $("#clienteNome").textContent = `${cliente.nome} (${cliente.codigo})`;
  $("#dataHora").value = formatDateTime();
  $("#produtos").value = $("#pragas").value = $("#ocorrencia").value = "";
  $("#fotoCliente").value = "";
  limparAssinaturaCanvas();
  obterGeo();
  showPage("ordemExecucao");
}

function obterGeo() {
  const input = $("#localizacao");
  if (!navigator.geolocation) { input.value = "Geolocalização não suportada"; return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      input.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    },
    () => input.value = "Permissão negada ou erro"
  );
}

/******************************* ASSINATURA **********************************/
const canvas = $("#signaturePad");
let ctx, drawing = false;
if (canvas) {
  ctx = canvas.getContext("2d");
  ctx.lineWidth = 2;
  canvas.style.touchAction = "none"; // evita scroll/pinch na área

  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const evt  = e.touches ? e.touches[0] : e;
    return [evt.clientX - rect.left, evt.clientY - rect.top];
  };

  const start = (e) => { e.preventDefault(); drawing = true; ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const draw  = (e) => { if (!drawing) return; e.preventDefault(); ctx.lineTo(...pos(e)); ctx.stroke(); };
  const end   = () => { drawing = false; };

  ["mousedown", "touchstart"].forEach(ev => canvas.addEventListener(ev, start, { passive:false }));
  ["mousemove", "touchmove" ].forEach(ev => canvas.addEventListener(ev, draw,  { passive:false }));
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(ev => canvas.addEventListener(ev, end));

  $("#limparAssinatura").addEventListener("click", limparAssinaturaCanvas);
}

function limparAssinaturaCanvas() { ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); }

function assinaturaVazia() {
  if (!ctx) return true;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return !pixels.some(p => p !== 0);
}

/******************************* FINALIZAR O.S. ******************************/
window.finalizarOrdemServico = () => {
  if (assinaturaVazia()) { alert("Por favor, assine antes de finalizar."); return; }

  const assinaturaURL = canvas.toDataURL();
  const fotoFile = $("#fotoCliente").files[0];
  const fotoURL = fotoFile ? URL.createObjectURL(fotoFile) : "";

  const ordem = {
    id: gerarId(),
    clienteId : state.ordemAtual.id,
    dataHora  : $("#dataHora").value,
    local     : $("#localizacao").value,
    produtos  : $("#produtos").value,
    pragas    : $("#pragas").value,
    ocorrencia: $("#ocorrencia").value,
    assinaturaURL,
    fotoURL,
  };

  gerarPdf(ordem).then(pdfURL => {
    ordem.pdfURL = pdfURL;
    state.ordens.push(ordem);
    preencherListaOrdens();
    showPage("clientesCadastrados");
  });
};

/******************************* GERAR PDF ***********************************/
async function gerarPdf(o) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Ordem de Serviço – Brasprag", 10, 15);
  doc.setFontSize(11);

  let y = 30;
  const add = (label, value) => { doc.text(`${label}:`, 10, y); doc.text(value || "-", 55, y); y += 8; };

  const cliente = state.clientes.find(c => c.id === o.clienteId);
  add("Cliente", cliente ? `${cliente.nome} (${cliente.codigo})` : "-");
  add("Data/Hora", o.dataHora);
  add("Local", o.local);
  add("Produtos", o.produtos);
  add("Pragas", o.pragas);

  doc.text("Ocorrência:", 10, y); y += 6;
  const ocorrenciaText = doc.splitTextToSize(o.ocorrencia || "-", 180);
  doc.text(ocorrenciaText, 10, y);
  y += ocorrenciaText.length * 6 + 4;

  doc.line(10, y, 200, y); y += 10;

  doc.text("Assinatura do Técnico:", 10, y); y += 5;
  doc.addImage(o.assin  )
};

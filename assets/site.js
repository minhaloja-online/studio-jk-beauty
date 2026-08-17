/* ============================================================
   MOTOR DO SITE
   Carrega o conteúdo do Firebase, aplica na página e liga
   os efeitos. Se o Firebase não responder, o site continua
   funcionando com o conteúdo padrão — nunca fica em branco.
   ============================================================ */
import { PADRAO, mesclar, migrar, valorEm, urlDasFontes, DIAS } from "./padrao.js";

const $  = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const podeHover = matchMedia("(hover:hover)").matches;

let CFG = migrar(structuredClone(PADRAO));
let FB = null;               // módulo do Firebase (carregado depois)
let fotosGaleria = [];       // já resolvidas para exibição

/* ------------------------------------------------------------
   CORES — o painel salva 5 cores; as outras são derivadas daqui
   ------------------------------------------------------------ */
const paraRgb = (hex) => {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
};
const paraHex = (rgb) => "#" + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const misturar = (a, b, t) => {
  const [r1, g1, b1] = paraRgb(a), [r2, g2, b2] = paraRgb(b);
  return paraHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
};

function aplicarAparencia(ap){
  const r = document.documentElement.style;
  r.setProperty("--porcelana",   ap.corFundo);
  r.setProperty("--porcelana-2", misturar(ap.corFundo, "#ffffff", .55));
  r.setProperty("--tinta",       ap.corTexto);
  r.setProperty("--tinta-suave", misturar(ap.corTexto, ap.corFundo, .55));
  r.setProperty("--rosewood",    ap.corPrimaria);
  r.setProperty("--rosewood-esc",misturar(ap.corPrimaria, "#000000", .25));
  r.setProperty("--blush",       misturar(ap.corPrimaria, ap.corFundo, .78));
  r.setProperty("--dourado",     ap.corDourada);
  r.setProperty("--ameixa",      ap.corEscura);
  r.setProperty("--display",     `'${ap.fonteTitulos}', Georgia, serif`);
  r.setProperty("--corpo",       `'${ap.fonteTexto}', system-ui, sans-serif`);
  r.setProperty("--escala",      String(ap.escalaTitulos || 1));
  document.documentElement.style.fontSize = (ap.tamanhoBase || 16) + "px";

  const link = $("#fontes");
  const nova = urlDasFontes(ap.fonteTitulos, ap.fonteTexto);
  if(link && link.href !== nova) link.href = nova;

  const tema = $('meta[name="theme-color"]');
  if(tema) tema.content = ap.corFundo;
}

/* ------------------------------------------------------------
   TEXTOS
   ------------------------------------------------------------ */
function aplicarTextos(cfg){
  cfg.marca.nomeCompleto = `${cfg.marca.nome1} <i>${cfg.marca.nome2}</i>`;
  $$("[data-txt]").forEach(el => {
    const v = valorEm(cfg, el.dataset.txt);
    if(typeof v === "string") el.textContent = v;
  });
  $$("[data-html]").forEach(el => {
    const v = valorEm(cfg, el.dataset.html);
    if(typeof v === "string") el.innerHTML = v;
  });

  document.title = `${cfg.marca.nome1} ${cfg.marca.nome2} | ${cfg.marca.resumo}`.slice(0, 90);
}

/* ------------------------------------------------------------
   LINKS DE CONTATO
   ------------------------------------------------------------ */
function aplicarContato(c){
  const zap = (servico) => {
    const texto = servico ? `Olá! Vim pelo site e gostaria de agendar: ${servico}.` : c.mensagem;
    return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(texto)}`;
  };
  const abrir = (el, href) => {
    el.setAttribute("href", href);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  };
  const time = equipeVisivel();

  // conversa direta (botão flutuante): escolhe a profissional quando há duas
  $$("[data-zap]").forEach(el => {
    if(time.length > 1){
      el.setAttribute("href", "#");
      el.removeAttribute("target");
      el.dataset.escolher = "";
    }else{
      abrir(el, time.length ? zapDe(time[0]) : zap());
    }
  });

  // agendamento: abre o fluxo de dia e hora
  $$("[data-agendar]").forEach(el => el.setAttribute("href", "#"));
  $$("[data-insta]").forEach(el => abrir(el, c.instagram));
  $$("[data-mapa]").forEach(el => abrir(el, c.mapsLink));
  $("#frame-mapa").src = "https://www.google.com/maps?q=" + encodeURIComponent(c.mapsBusca) + "&output=embed";
}

/* ------------------------------------------------------------
   FOTOS
   ------------------------------------------------------------ */
function pintarFoto(chave, url){
  $$(`[data-foto="${chave}"]`).forEach(box => {
    if(!url) return;
    box.classList.add("tem-foto");
    $(".foto", box).style.backgroundImage = `url("${url}")`;
  });
}

async function aplicarFotos(cfg){
  const refs = [
    ...Object.values(cfg.imagens),
    ...cfg.galeriaFotos,
    ...cfg.servicos.itens.map(i => i.foto),
    ...(cfg.profissionais || []).map(p => p.foto)
  ];
  let cache = {};
  if(FB){
    try { cache = await FB.lerVariasMidias(FB.idsDeMidia(refs)); } catch {}
  }
  const resolver = (r) => FB ? FB.resolverFoto(r, cache) : (r?.startsWith("midia:") ? "" : r || "");

  Object.entries(cfg.imagens).forEach(([k, v]) => pintarFoto(k, resolver(v)));
  fotosGaleria = cfg.galeriaFotos.map(resolver);
  montarGaleria();
  montarServicos(resolver);
  montarEquipe(resolver);
  montarRodapeEquipe();
  montarZapsDoLocal();
}

/* ------------------------------------------------------------
   LETREIRO / GALERIA / DEPOIMENTOS
   ------------------------------------------------------------ */
const escapar = (t) => String(t).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function montarLetreiro(lista){
  const itens = lista.map(t => `<span>${escapar(t)}</span>`).join("");
  $("#trilha").innerHTML = itens + itens;   // duplicado para o loop não ter emenda
}

const svgEstrela = (cheia) =>
  `<svg viewBox="0 0 24 24" fill="${cheia ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.3"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z"/></svg>`;
const linhaEstrelas = (nota) => [1,2,3,4,5].map(i => svgEstrela(i <= Math.round(nota))).join("");

/** Profissionais que aparecem para a cliente. */
function equipeVisivel(){
  return (CFG.profissionais || []).filter(p => p.visivel !== false && (p.nome || "").trim());
}

/** Link de WhatsApp de uma profissional (ou o do studio, se ela não tiver). */
function zapDe(prof, servico){
  const numero = (prof?.whatsapp || "").replace(/\D/g, "") || CFG.contato.whatsapp;
  const texto = servico
    ? `Olá${prof?.nome ? `, ${prof.nome}` : ""}! Vim pelo site e gostaria de agendar: ${servico}.`
    : (prof?.nome ? `Olá, ${prof.nome}! Vim pelo site e gostaria de agendar um horário.` : CFG.contato.mensagem);
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

const acharProf = (id) => (CFG.profissionais || []).find(p => p.id === id);

/* ============================================================
   AGENDAMENTO PELO SITE
   A cliente escolhe profissional → serviço → dia → hora.
   O pedido nasce como "aguardando validação" e só tranca a agenda
   quando a profissional confirmar no painel.
   ============================================================ */
const AG = { prof: null, servico: null, data: null, hora: null, link: "" };

const mm  = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const iso  = (d) => d.toLocaleDateString("sv-SE");
const porExtenso = (isoData) => {
  const [a, m, dia] = isoData.split("-").map(Number);
  const d = new Date(a, m - 1, dia);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
};
const duracaoTexto = (min) => {
  const h = Math.floor(min / 60), r = min % 60;
  return h && r ? `${h}h${String(r).padStart(2, "0")}` : h ? `${h}h` : `${r} min`;
};

/** Serviços que a profissional escolhida atende. */
function servicosDe(prof){
  return CFG.servicos.itens.filter(s =>
    s.visivel !== false && (s.nome || "").trim() &&
    (!s.profissionalId || s.profissionalId === prof.id));
}

/** Grade de horários livres de um dia, já descontando o que está ocupado. */
function horariosLivres(prof, isoData, duracao, ocupados){
  const dia = DIAS[new Date(isoData + "T12:00:00").getDay()].id;
  const janela = prof.horarios?.[dia];
  if(!janela || janela.ativo === false) return [];

  const abre = mm(janela.de), fecha = mm(janela.ate);
  const passo = Math.max(15, +prof.intervalo || 30);
  const almoco = prof.almoco?.ativo ? [mm(prof.almoco.de), mm(prof.almoco.ate)] : null;

  const agora = new Date();
  const limite = isoData === iso(agora)
    ? agora.getHours() * 60 + agora.getMinutes() + (+prof.antecedenciaHoras || 0) * 60
    : -1;

  // só o que a profissional já confirmou ocupa lugar
  const tomados = ocupados
    .filter(o => o.status === "agendado" || o.status === "concluido")
    .map(o => [mm(o.inicio), mm(o.fim)]);

  const livres = [];
  for(let t = abre; t + duracao <= fecha; t += passo){
    const fim = t + duracao;
    if(t < limite) continue;
    if(almoco && t < almoco[1] && fim > almoco[0]) continue;
    if(tomados.some(([a, b]) => t < b && fim > a)) continue;
    livres.push(hhmm(t));
  }
  return livres;
}

/* ---- telas ---- */
function irParaEtapa(n){
  $$("#agendar .etapa").forEach(e => e.classList.toggle("ativa", +e.dataset.etapa === n));
  $$("#agendar .trilho .ponto").forEach(p => {
    const i = +p.dataset.etapa;
    p.classList.toggle("ativo", i === n);
    p.classList.toggle("feito", i < n);
  });
  $("#agendar .caixa").scrollTop = 0;
}

function abrirAgendamento(servicoNome){
  const time = equipeVisivel();
  if(!time.length) return;

  AG.prof = null; AG.servico = null; AG.data = null; AG.hora = null;
  $("#ag-erro").textContent = "";

  $("#ag-profs").innerHTML = time.map(p => `
    <button class="opcao" data-prof="${p.id}">
      <span class="av" style="${p._foto ? `background-image:url('${p._foto}')` : ""}">${p._foto ? "" : escapar((p.nome || "?")[0])}</span>
      <span class="txt"><b>${escapar(p.nome)}</b><small>${escapar(p.funcao || "")}</small></span>
    </button>`).join("");

  $("#agendar").classList.add("aberto");
  document.body.classList.add("travado");

  // com uma só profissional, ou quando o serviço já tem dona, pula etapas
  if(time.length === 1){ escolherProfissional(time[0].id, servicoNome); return; }
  const dono = servicoNome && acharProf(
    CFG.servicos.itens.find(s => s.nome === servicoNome)?.profissionalId);
  if(dono && dono.visivel !== false){ escolherProfissional(dono.id, servicoNome); return; }
  irParaEtapa(1);
}

function fecharAgendamento(){
  $("#agendar").classList.remove("aberto");
  document.body.classList.remove("travado");
}

function escolherProfissional(id, servicoNome){
  AG.prof = acharProf(id);
  const lista = servicosDe(AG.prof);

  $("#ag-servicos").innerHTML = lista.length ? lista.map(s => `
    <button class="opcao" data-servico="${escapar(s.nome)}">
      <span class="txt"><b>${escapar(s.nome)}</b><small>${escapar(s.preco || "")}</small></span>
      <span class="tempo">${duracaoTexto(+s.duracao || 60)}</span>
    </button>`).join("")
    : `<p class="dica">Nenhum serviço cadastrado para ela ainda.</p>`;

  const jaEscolhido = servicoNome && lista.find(s => s.nome === servicoNome);
  if(jaEscolhido) return escolherServico(jaEscolhido.nome);
  irParaEtapa(2);
}

function escolherServico(nome){
  AG.servico = servicosDe(AG.prof).find(s => s.nome === nome);
  if(!AG.servico) return;
  $("#ag-resumo-servico").textContent =
    `${AG.servico.nome} · ${duracaoTexto(+AG.servico.duracao || 60)} reservadas com ${AG.prof.nome}`;
  montarDias();
  irParaEtapa(3);
}

function montarDias(){
  const hoje = new Date();
  const total = Math.min(60, +AG.prof.diasAFrente || 45);
  const dias = [];
  for(let i = 0; i < total; i++){
    const d = new Date(hoje); d.setDate(hoje.getDate() + i);
    const cfgDia = AG.prof.horarios?.[DIAS[d.getDay()].id];
    if(!cfgDia || cfgDia.ativo === false) continue;
    dias.push(d);
  }

  $("#ag-dias").innerHTML = dias.slice(0, 21).map((d, i) => `
    <button data-dia="${iso(d)}">
      <small>${DIAS[d.getDay()].curto}</small>
      <b>${String(d.getDate()).padStart(2, "0")}</b>
      <i>${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</i>
    </button>`).join("") || `<p class="dica">Nenhum dia de atendimento configurado.</p>`;

  if(dias.length) escolherDia(iso(dias[0]));
}

async function escolherDia(isoData){
  AG.data = isoData; AG.hora = null;
  $$("#ag-dias button").forEach(b => b.classList.toggle("on", b.dataset.dia === isoData));
  $("#ag-horas").innerHTML = `<p class="nada">Vendo os horários livres…</p>`;

  let ocupados = [];
  try{
    ocupados = FB ? await FB.agendaDoDia(AG.prof.id, isoData) : [];
  }catch(e){ console.warn("Não deu para ler a agenda:", e); }

  const livres = horariosLivres(AG.prof, isoData, +AG.servico.duracao || 60, ocupados);
  $("#ag-horas").innerHTML = livres.length
    ? livres.map(h => `<button data-hora="${h}">${h}</button>`).join("")
    : `<p class="nada">Nenhum horário livre neste dia para esse serviço.<br>Tente outra data.</p>`;
}

function escolherHora(h){
  AG.hora = h;
  const dur = +AG.servico.duracao || 60;
  const fim = hhmm(mm(h) + dur);

  $("#ag-resumo").innerHTML = `
    <div><span>Profissional</span><b>${escapar(AG.prof.nome)}</b></div>
    <div><span>Serviço</span><b>${escapar(AG.servico.nome)}</b></div>
    <div><span>Dia</span><b>${porExtenso(AG.data)}</b></div>
    <div><span>Horário</span><b>${h} às ${fim} (${duracaoTexto(dur)})</b></div>`;

  $("#ag-alerta").innerHTML =
    `Para confirmar, é preciso enviar a mensagem no WhatsApp de <b>${escapar(AG.prof.nome)}</b>. ` +
    `O horário fica reservado quando ela responder confirmando.`;

  irParaEtapa(4);
}

async function enviarPedido(){
  const nome = $("#ag-nome").value.trim();
  const erro = $("#ag-erro");
  if(nome.length < 2){ erro.textContent = "Escreva seu nome para a profissional saber quem é."; return; }
  erro.textContent = "";

  const bt = $("#ag-enviar");
  bt.disabled = true; $("span", bt).textContent = "Registrando…";

  const dur = +AG.servico.duracao || 60;
  const fim = hhmm(mm(AG.hora) + dur);
  const texto =
    `Olá, ${AG.prof.nome}! Quero confirmar um horário pelo site do Studio JK Beauty:\n\n` +
    `Serviço: ${AG.servico.nome}\n` +
    `Dia: ${porExtenso(AG.data)}\n` +
    `Horário: ${AG.hora} às ${fim}\n` +
    `Nome: ${nome}\n\n` +
    `Pode confirmar para mim?`;
  const numero = (AG.prof.whatsapp || "").replace(/\D/g, "") || CFG.contato.whatsapp;
  AG.link = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

  // abre o WhatsApp primeiro: se o registro falhar, a cliente ainda fala com ela
  const janela = window.open(AG.link, "_blank", "noopener");

  try{
    if(FB) await FB.pedirHorario({
      profissionalId: AG.prof.id,
      data: AG.data, inicio: AG.hora, fim, duracao: dur,
      servico: AG.servico.nome, cliente: nome
    });
  }catch(e){
    console.warn("O pedido não foi registrado no painel:", e);
  }

  $("#ag-final").innerHTML = janela
    ? `Agora envie a mensagem que abrimos no WhatsApp de <b>${escapar(AG.prof.nome)}</b>. Enquanto ela não confirmar, o horário segue disponível para outras clientes.`
    : `Toque no botão abaixo para abrir o WhatsApp de <b>${escapar(AG.prof.nome)}</b> e enviar a mensagem.`;

  bt.disabled = false; $("span", bt).textContent = "Enviar no WhatsApp";
  irParaEtapa(5);
}

function ligarAgendamento(){
  $("#ag-fechar").addEventListener("click", fecharAgendamento);
  $("#ag-terminar").addEventListener("click", fecharAgendamento);
  $("#agendar").addEventListener("click", e => { if(e.target.id === "agendar") fecharAgendamento(); });
  $("#ag-reenviar").addEventListener("click", () => window.open(AG.link, "_blank", "noopener"));
  $("#ag-enviar").addEventListener("click", enviarPedido);

  $$("#agendar .voltar").forEach(b =>
    b.addEventListener("click", () => irParaEtapa(+b.dataset.voltar)));

  $("#ag-profs").addEventListener("click", e => {
    const b = e.target.closest("[data-prof]");
    if(b) escolherProfissional(b.dataset.prof);
  });
  $("#ag-servicos").addEventListener("click", e => {
    const b = e.target.closest("[data-servico]");
    if(b) escolherServico(b.dataset.servico);
  });
  $("#ag-dias").addEventListener("click", e => {
    const b = e.target.closest("[data-dia]");
    if(b) escolherDia(b.dataset.dia);
  });
  $("#ag-horas").addEventListener("click", e => {
    const b = e.target.closest("[data-hora]");
    if(b) escolherHora(b.dataset.hora);
  });
}

/** Contatos de cada profissional no rodapé. */
/** WhatsApp de cada profissional na seção "Onde ficamos". */
function montarZapsDoLocal(){
  const alvo = $("#local-zaps");
  if(!alvo) return;
  const time = equipeVisivel().filter(p => (p.whatsapp || "").replace(/\D/g, ""));
  if(!time.length){
    alvo.innerHTML = `<span>${escapar(CFG.contato.whatsappTexto || "")}</span>`;
    return;
  }
  alvo.innerHTML = time.map(p => `
    <a href="${zapDe(p)}" target="_blank" rel="noopener">
      ${escapar(formatarZap(p.whatsapp.replace(/\D/g, "")))}
      <i>${escapar(p.nome)}</i>
    </a>`).join("");
}

function montarRodapeEquipe(){
  const alvo = $("#rodape-equipe");
  if(!alvo) return;
  const time = equipeVisivel();
  const so = time.length === 1;

  alvo.innerHTML = time.map(p => {
    const numero = (p.whatsapp || "").replace(/\D/g, "");
    const linhas = [];

    if(numero) linhas.push(`
      <li><a href="${zapDe(p)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6.5C4 15 9 20 17.5 20c1.5 0 2.5-1 2.5-2.2v-2l-4-1.6-1.7 2c-2.6-1.2-4.3-2.9-5.4-5.4l2-1.7L9.3 5h-2C6.1 5 4 5.9 4 6.5z"/></svg>
        <span>${escapar(formatarZap(numero))}</span></a></li>`);

    if(p.instagram) linhas.push(`
      <li><a href="${p.instagram}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
        <span>${escapar(arrobaDe(p.instagram))}</span></a></li>`);

    if(!linhas.length) return "";
    return `<div class="rod-prof">
      ${so ? "" : `<span class="nome">${escapar(p.nome)}${p.funcao ? `<em>${escapar(p.funcao)}</em>` : ""}</span>`}
      <ul>${linhas.join("")}</ul>
    </div>`;
  }).join("");
}

/** (93) 99179-7198 a partir de 5593991797198 */
function formatarZap(n){
  const s = n.replace(/^55/, "");
  if(s.length < 10) return n;
  const ddd = s.slice(0, 2), resto = s.slice(2);
  const meio = resto.length > 8 ? resto.slice(0, 5) : resto.slice(0, 4);
  return `(${ddd}) ${meio}-${resto.slice(meio.length)}`;
}

/** @usuario a partir do endereço do Instagram */
function arrobaDe(url){
  const m = String(url).match(/instagram\.com\/([^/?#]+)/i);
  return m ? "@" + m[1] : url;
}

function montarEquipe(resolver = (r) => (r?.startsWith("midia:") ? "" : r || "")){
  const alvo = $("#equipe-lista");
  if(!alvo) return;
  const time = equipeVisivel();
  const secao = $("#equipe");

  // uma profissional só: a seção não faz sentido
  if(time.length < 2){ if(secao) secao.style.display = time.length ? "" : "none"; }
  alvo.innerHTML = time.map((p, i) => {
    const url = resolver(p.foto);
    p._foto = url;                      // reaproveitada no modal de escolha
    return `
    <article class="prof rev" data-atraso="${i % 4}">
      <div class="arco grao ${url ? "tem-foto" : ""}">
        <div class="foto" style="${url ? `background-image:url('${url.replace(/'/g, "%27")}')` : ""}"></div>
        <div class="marca"><b>${escapar((p.nome || "JK").slice(0, 2).toUpperCase())}</b><small>Foto</small></div>
      </div>
      <h3>${escapar(p.nome)}</h3>
      <span class="funcao">${escapar(p.funcao || "")}</span>
      ${p.bio ? `<p class="bio">${escapar(p.bio)}</p>` : ""}
      <div class="contatos">
        <a class="btn" href="${zapDe(p)}" target="_blank" rel="noopener"><span>Agendar</span></a>
        ${p.instagram ? `<a class="so-insta" href="${p.instagram}" target="_blank" rel="noopener" aria-label="Instagram de ${escapar(p.nome)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>` : ""}
      </div>
    </article>`;
  }).join("");
  $$("#equipe-lista .rev").forEach(el => olho.observe(el));
}

/* ---- escolha de profissional no agendamento ---- */
function abrirEscolha(servico){
  const time = equipeVisivel();
  $("#escolher-lista").innerHTML = time.map(p => `
    <a class="op" href="${zapDe(p, servico)}" target="_blank" rel="noopener">
      <span class="av" style="${p._foto ? `background-image:url('${p._foto}')` : ""}">${p._foto ? "" : escapar((p.nome || "?")[0])}</span>
      <span><b>${escapar(p.nome)}</b><small>${escapar(p.funcao || "")}</small></span>
    </a>`).join("");
  $("#escolher").classList.add("aberto");
  document.body.classList.add("travado");
}
function fecharEscolha(){
  $("#escolher").classList.remove("aberto");
  document.body.classList.remove("travado");
}

function montarServicos(resolver = (r) => (r?.startsWith("midia:") ? "" : r || "")){
  const alvo = $("#grade-serv");
  if(!alvo) return;

  const itens = CFG.servicos.itens.filter(s => s.visivel !== false && (s.nome || "").trim());
  if(!itens.length){
    alvo.innerHTML = `<div class="vazio" style="grid-column:1/-1">Nenhum serviço cadastrado ainda.</div>`;
    return;
  }

  const varias = equipeVisivel().length > 1;
  alvo.innerHTML = itens.map((s, i) => {
    const url = resolver(s.foto);
    const dona = acharProf(s.profissionalId);
    const mostraDona = varias && dona && dona.visivel !== false;
    return `
    <article class="serv rev" data-atraso="${i % 4}">
      <div class="arco grao ${url ? "tem-foto" : ""}">
        <div class="foto" style="${url ? `background-image:url('${url.replace(/'/g, "%27")}')` : ""}"></div>
        <div class="marca"><b>JK</b><small>Foto</small></div>
      </div>
      ${mostraDona ? `<span class="quem-faz">com ${escapar(dona.nome)}</span>` : ""}
      <h3>${escapar(s.nome)}</h3>
      <p>${escapar(s.texto || "")}</p>
      <div class="rodape">
        <span class="preco">${escapar(s.preco || "")}</span>
        <a class="marcar" href="#" data-agendar="${escapar(s.nome)}">Agendar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>
    </article>`;
  }).join("");

  $$("#grade-serv .rev").forEach(el => olho.observe(el));
  inclinar($$("#grade-serv .serv"));
}

function montarGaleria(){
  $("#mosaico").innerHTML = fotosGaleria.map((url, i) => `
    <button class="peca rev" data-atraso="${i % 4}" data-i="${i}" aria-label="Ampliar foto ${i + 1}">
      <div class="arco grao ${url ? "tem-foto" : ""}">
        <div class="foto" style="${url ? `background-image:url('${url}')` : ""}"></div>
        <div class="marca"><b>JK</b><small>Foto ${i + 1}</small></div>
      </div>
      <span class="lupa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></span>
    </button>`).join("");
  $$("#mosaico .rev").forEach(el => olho.observe(el));
}

function montarDepoimentos(lista){
  const alvo = $("#depos"), media = $("#media"), fita = $("#fita");

  if(!lista.length){
    alvo.innerHTML = `<div class="vazio">Ainda não há avaliações publicadas.<br>Seja a primeira a contar como foi.</div>`;
    media.innerHTML = "";
    fita.hidden = true;
    return;
  }

  const nota = lista.reduce((s, d) => s + d.nota, 0) / lista.length;
  const rotulo = lista.length === 1 ? "avaliação" : "avaliações";

  media.innerHTML = `
    <span class="nota">${nota.toFixed(1).replace(".", ",")}</span>
    <div><div class="estrelas">${linhaEstrelas(nota)}</div>
    <small>${lista.length} ${rotulo}</small></div>`;

  fita.hidden = false;
  $(".estrelas", fita).innerHTML = linhaEstrelas(nota);
  $("#fita-nota").textContent = nota.toFixed(1).replace(".", ",");
  $("#fita-txt").innerHTML = `de ${lista.length} ${rotulo}<br>das clientes`;

  const iniciais = (n) => n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  alvo.innerHTML = lista.slice(0, 9).map((d, i) => `
    <article class="dep rev" data-atraso="${i % 3}">
      <span class="aspas">&ldquo;</span>
      <div class="estrelas">${linhaEstrelas(d.nota)}</div>
      <p>${escapar(d.texto)}</p>
      <div class="quem">
        <span class="ini">${escapar(iniciais(d.nome))}</span>
        <div><b>${escapar(d.nome)}</b><small>Cliente do studio</small></div>
      </div>
    </article>`).join("");
  $$("#depos .rev").forEach(el => olho.observe(el));
}

/* ------------------------------------------------------------
   EFEITOS
   ------------------------------------------------------------ */
const olho = new IntersectionObserver((ent) => {
  ent.forEach(e => { if(e.isIntersecting){ e.target.classList.add("vis"); olho.unobserve(e.target); } });
}, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
$$(".rev").forEach(el => olho.observe(el));

/* cabeçalho */
const topo = $("#topo");
const aoRolar = () => topo.classList.toggle("fixo", scrollY > 40);
aoRolar();
addEventListener("scroll", aoRolar, { passive: true });

/* menu do celular */
const hamb = $("#hamb"), painel = $("#painel");
const alterna = (abrir) => {
  hamb.classList.toggle("ativo", abrir);
  painel.classList.toggle("aberto", abrir);
  document.body.classList.toggle("travado", abrir);
  hamb.setAttribute("aria-expanded", String(abrir));
  $$("a", painel).forEach((a, i) => a.style.transitionDelay = abrir ? `${.12 + i * .06}s` : "0s");
};
hamb.onclick = () => alterna(!painel.classList.contains("aberto"));
$$("a", painel).forEach(a => a.addEventListener("click", () => alterna(false)));

/* cartela lateral */
const botoes = $$("#cartela button");
botoes.forEach(b => b.onclick = () =>
  document.getElementById(b.dataset.ir)?.scrollIntoView({ behavior: semMovimento ? "auto" : "smooth" }));
new IntersectionObserver((ent) => {
  ent.forEach(e => {
    if(e.isIntersecting) botoes.forEach(b => b.classList.toggle("ativo", b.dataset.ir === e.target.id));
  });
}, { threshold: .3, rootMargin: "-40% 0px -40% 0px" }).observe && $$("section[id]").forEach(s => {
  new IntersectionObserver((ent) => {
    ent.forEach(e => {
      if(e.isIntersecting) botoes.forEach(b => b.classList.toggle("ativo", b.dataset.ir === e.target.id));
    });
  }, { threshold: .3, rootMargin: "-40% 0px -40% 0px" }).observe(s);
});

/* brilho no hero */
if(!semMovimento && podeHover){
  const hero = $(".hero"), brilho = $("#brilho");
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    brilho.style.left = (e.clientX - r.left) + "px";
    brilho.style.top  = (e.clientY - r.top) + "px";
    brilho.style.opacity = "1";
  });
  hero.addEventListener("pointerleave", () => brilho.style.opacity = "0");

}

/** Inclinação 3D de acordo com o cursor. */
function inclinar(cards){
  if(semMovimento || !podeHover) return;
  cards.forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `translateY(-8px) perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
    });
    card.addEventListener("pointerleave", () => card.style.transform = "");
  });
}

/* parallax da foto do hero */
if(!semMovimento){
  const foto = $(".hero-arte .arco");
  addEventListener("scroll", () => {
    foto.style.transform = `translateY(${Math.min(scrollY, 700) * .06}px)`;
  }, { passive: true });
}

/* lightbox */
const lupa = $("#lupa"), quadro = $("#lupa-quadro");
let atual = 0;
const mostraFoto = (i) => {
  const total = fotosGaleria.length || 1;
  atual = (i + total) % total;
  const url = fotosGaleria[atual];
  quadro.style.backgroundImage = url ? `url("${url}")` : "none";
  quadro.innerHTML = url ? "" : `<div style="display:grid;place-content:center;height:100%;font-family:var(--display);font-size:3rem;color:rgba(42,29,34,.3)">JK</div>`;
};
const fechaLupa = () => { lupa.classList.remove("aberto"); document.body.classList.remove("travado"); };
$("#mosaico").addEventListener("click", e => {
  const peca = e.target.closest(".peca");
  if(!peca) return;
  mostraFoto(+peca.dataset.i);
  lupa.classList.add("aberto");
  document.body.classList.add("travado");
});
$("#lupa-fechar").onclick = fechaLupa;
$("#lupa-ant").onclick = () => mostraFoto(atual - 1);
$("#lupa-prox").onclick = () => mostraFoto(atual + 1);
lupa.addEventListener("click", e => { if(e.target === lupa) fechaLupa(); });

/* ------------------------------------------------------------
   MODAL DE AVALIAÇÃO
   ------------------------------------------------------------ */
const modal = $("#modal"), notas = $("#notas");
let notaEscolhida = 0, jaEnviou = false;

notas.innerHTML = [1,2,3,4,5].map(n =>
  `<button type="button" data-n="${n}" role="radio" aria-checked="false" aria-label="${n} de 5">${svgEstrela(false)}</button>`).join("");

const pintaNota = (n) => $$("#notas button").forEach(b => {
  const on = +b.dataset.n <= n;
  b.classList.toggle("on", on);
  b.innerHTML = svgEstrela(on);
  b.setAttribute("aria-checked", String(+b.dataset.n === notaEscolhida));
});
notas.addEventListener("click", e => {
  const b = e.target.closest("button");
  if(b){ notaEscolhida = +b.dataset.n; pintaNota(notaEscolhida); }
});
notas.addEventListener("pointerover", e => {
  const b = e.target.closest("button");
  if(b) pintaNota(+b.dataset.n);
});
notas.addEventListener("pointerleave", () => pintaNota(notaEscolhida));

const fechaModal = () => {
  modal.classList.remove("aberto");
  document.body.classList.remove("travado");
  setTimeout(() => {
    modal.classList.remove("enviado");
    $("#av-nome").value = ""; $("#av-texto").value = "";
    $("#conta").textContent = "0"; $("#av-erro").textContent = "";
    notaEscolhida = 0; pintaNota(0);
  }, 420);
};
$("#abrir-modal").onclick = () => {
  modal.classList.add("aberto");
  document.body.classList.add("travado");
  setTimeout(() => $("#av-nome").focus(), 350);
};
$("#fechar-modal").onclick = fechaModal;
$("#fechar-obrigada").onclick = fechaModal;
modal.addEventListener("click", e => { if(e.target === modal) fechaModal(); });
$("#av-texto").addEventListener("input", e => $("#conta").textContent = e.target.value.length);

$("#enviar-av").onclick = async () => {
  const nome = $("#av-nome").value.trim();
  const texto = $("#av-texto").value.trim();
  const erro = $("#av-erro");
  const botao = $("#enviar-av");

  if(nome.length < 2)   return erro.textContent = "Escreva seu nome para a gente saber quem é.";
  if(!notaEscolhida)    return erro.textContent = "Escolha de 1 a 5 estrelas.";
  if(texto.length < 10) return erro.textContent = "Conte um pouquinho mais — pelo menos 10 caracteres.";
  if(jaEnviou)          return erro.textContent = "Você já enviou uma avaliação agora há pouco. Obrigada!";
  if(!FB)               return erro.textContent = "O envio está indisponível no momento. Tente mais tarde.";

  erro.textContent = "";
  botao.disabled = true;
  $("span", botao).textContent = "Enviando…";

  try{
    await FB.enviarAvaliacao({ nome, nota: notaEscolhida, texto });
    jaEnviou = true;
    modal.classList.add("enviado");
  }catch(e){
    erro.textContent = FB.explicarErro(e) || "Não deu para enviar agora. Tente de novo em instantes.";
  }finally{
    botao.disabled = false;
    $("span", botao).textContent = "Enviar avaliação";
  }
};

/* teclado */
  document.addEventListener("click", e => {
    const marcar = e.target.closest("[data-agendar]");
    if(marcar){
      e.preventDefault();
      abrirAgendamento(marcar.dataset.agendar || "");
      return;
    }
    const gatilho = e.target.closest("[data-escolher]");
    if(gatilho){
      e.preventDefault();
      abrirEscolha(gatilho.dataset.escolher || "");
    }
  });

  ligarAgendamento();

  $("#fechar-escolher").addEventListener("click", fecharEscolha);
  $("#escolher").addEventListener("click", e => { if(e.target.id === "escolher") fecharEscolha(); });
  $("#escolher-lista").addEventListener("click", e => { if(e.target.closest(".op")) fecharEscolha(); });

addEventListener("keydown", e => {
  if(e.key === "Escape"){
    if($("#agendar").classList.contains("aberto")) fecharAgendamento();
    if($("#escolher").classList.contains("aberto")) fecharEscolha();
    if(lupa.classList.contains("aberto")) fechaLupa();
    if(modal.classList.contains("aberto")) fechaModal();
    if(painel.classList.contains("aberto")) alterna(false);
  }
  if(lupa.classList.contains("aberto")){
    if(e.key === "ArrowRight") mostraFoto(atual + 1);
    if(e.key === "ArrowLeft")  mostraFoto(atual - 1);
  }
});

/* ------------------------------------------------------------
   PARTIDA
   ------------------------------------------------------------ */
$("#ano").textContent = new Date().getFullYear();

const liberarTela = () => {
  $("#carga").classList.add("sai");
  document.body.classList.add("pronto");
};
setTimeout(liberarTela, semMovimento ? 200 : 1400);
setTimeout(liberarTela, 3500);   // rede de segurança

// desenha já com o padrão, para o site nunca aparecer vazio
aplicarAparencia(CFG.aparencia);
aplicarTextos(CFG);
aplicarContato(CFG.contato);
montarLetreiro(CFG.letreiro);
fotosGaleria = CFG.galeriaFotos.slice();
montarGaleria();
montarServicos();
montarEquipe();
montarRodapeEquipe();
montarZapsDoLocal();

// e então busca o conteúdo real
(async () => {
  try{
    FB = await import("./firebase.js");
  }catch(e){
    console.warn("Firebase não carregou — o site segue com o conteúdo padrão.", e);
    montarDepoimentos([]);
    return;
  }

  try{
    const salvo = await FB.lerConfig();
    if(salvo){
      CFG = migrar(mesclar(PADRAO, salvo));
      aplicarAparencia(CFG.aparencia);
      aplicarTextos(CFG);
      aplicarContato(CFG.contato);
      montarLetreiro(CFG.letreiro);
    }
    await aplicarFotos(CFG);
  }catch(e){ console.warn("Não deu para ler as configurações:", e); }

  try{
    montarDepoimentos(await FB.avaliacoesAprovadas());
  }catch(e){
    console.warn("Não deu para ler as avaliações:", e);
    montarDepoimentos([]);
  }
})();

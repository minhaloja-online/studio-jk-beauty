/* ============================================================
   MOTOR DO SITE
   Carrega o conteúdo do Firebase, aplica na página e liga
   os efeitos. Se o Firebase não responder, o site continua
   funcionando com o conteúdo padrão — nunca fica em branco.
   ============================================================ */
import { PADRAO, mesclar, valorEm, urlDasFontes } from "./padrao.js";

const $  = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const podeHover = matchMedia("(hover:hover)").matches;

let CFG = structuredClone(PADRAO);
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

  // serviços escondidos pelo painel
  $$("[data-servico]").forEach(card => {
    const item = cfg.servicos.itens[+card.dataset.servico];
    card.classList.toggle("oculto", item && item.visivel === false);
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
  $$("[data-zap]").forEach(el => abrir(el, zap()));
  $$("[data-zap-servico]").forEach(el => abrir(el, zap(CFG.servicos.itens[+el.dataset.zapServico]?.nome)));
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
  const refs = [...Object.values(cfg.imagens), ...cfg.galeriaFotos];
  let cache = {};
  if(FB){
    try { cache = await FB.lerVariasMidias(FB.idsDeMidia(refs)); } catch {}
  }
  const resolver = (r) => FB ? FB.resolverFoto(r, cache) : (r?.startsWith("midia:") ? "" : r || "");

  Object.entries(cfg.imagens).forEach(([k, v]) => pintarFoto(k, resolver(v)));
  fotosGaleria = cfg.galeriaFotos.map(resolver);
  montarGaleria();
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

  $$(".serv").forEach(card => {
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
addEventListener("keydown", e => {
  if(e.key === "Escape"){
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
      CFG = mesclar(PADRAO, salvo);
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

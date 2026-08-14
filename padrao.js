/* ============================================================
   CONTEÚDO PADRÃO
   É o que aparece enquanto nada foi salvo no painel, e o que o
   botão "Restaurar padrão" devolve. Depois que o painel salva,
   quem manda é o Firestore (documento config/site).
   ============================================================ */
export const PADRAO = {

  marca: {
    nome1: "Studio JK",
    nome2: "Beauty",
    local: "Santarém · PA",
    slogan: "Beleza · Cuidado · Elegância",
    resumo: "Manicure, pedicure, unhas em gel e nail art com hora marcada em Santarém, Pará."
  },

  hero: {
    rotulo: "Manicure & Nail Art · Santarém",
    titulo1: "Unhas feitas",
    titulo2: "com calma,",
    titulo3: "do seu jeito.",
    texto: "Um horário por vez, material esterilizado e acabamento que dura semanas. Você escolhe a cor sem pressa — e sai com a unha que imaginou.",
    btn1: "Agendar pelo WhatsApp",
    btn2: "Ver os serviços",
    selo1: "Hora marcada",
    selo2: "Material esterilizado"
  },

  sobre: {
    rotulo: "O studio",
    titulo: "Um horário<br>só seu.",
    p1: "Aqui não tem correria nem sala cheia. Cada horário é reservado para uma cliente por vez, com material esterilizado, tempo para escolher a cor com calma e cuidado em cada canto da cutícula.",
    p2: "O Studio JK Beauty nasceu da ideia de que cuidar das unhas pode ser a melhor parte da semana — e não mais uma coisa correndo na agenda.",
    profissional: "Karine",
    cargo: "Nail designer",
    pontos: [
      { titulo: "Atendimento individual", texto: "Uma cliente por horário, sem espera e sem sobreposição." },
      { titulo: "Esterilização a cada atendimento", texto: "Alicates e espátulas passam por autoclave antes de encostarem em você." },
      { titulo: "Acabamento que dura", texto: "Preparo correto da unha e produtos profissionais para o esmalte durar semanas." }
    ]
  },

  servicos: {
    rotulo: "Serviços",
    titulo: "Escolha o seu cuidado",
    nota: "Valores conversados no WhatsApp, de acordo com o tamanho e o estado da unha. Sem surpresa na hora de pagar.",
    itens: [
      { nome: "Manicure",      texto: "Cutícula feita com cuidado, formato do seu gosto e esmaltação impecável.", preco: "Sob consulta", visivel: true },
      { nome: "Pedicure",      texto: "Pés cuidados de verdade, com esfoliação e aquele alívio no fim do dia.", preco: "Sob consulta", visivel: true },
      { nome: "Unhas em gel",  texto: "Alongamento e blindagem para unhas resistentes, com brilho que não cai.", preco: "Sob consulta", visivel: true },
      { nome: "Nail Art",      texto: "Desenho feito à mão, francesinha, pedraria — traga a referência que a gente faz.", preco: "Sob consulta", visivel: true }
    ]
  },

  diferenciais: {
    rotulo: "Por dentro",
    titulo: "Por que as clientes<br>voltam",
    itens: [
      { titulo: "Hora marcada de verdade", texto: "Seu horário é seu. Nada de chegar e esperar duas clientes na sua frente — a agenda é montada com folga entre um atendimento e outro." },
      { titulo: "Higiene sem atalho",      texto: "Autoclave, descartáveis e bancada limpa a cada cliente." },
      { titulo: "Produtos profissionais",  texto: "Esmaltes e géis de marcas conhecidas, sem economia no que fica na sua unha." },
      { titulo: "Sua unha, seu estilo",    texto: "Clássica e discreta ou cheia de arte — a gente conversa antes de começar e decide junto o formato, o tamanho e a cor." }
    ]
  },

  galeria: {
    rotulo: "Nosso trabalho",
    titulo: "Inspire-se para<br>a próxima",
    botao: "Ver mais no Instagram"
  },

  depoimentos: {
    rotulo: "Depoimentos",
    titulo: "Quem já sentou<br>nessa cadeira",
    convite: "Já foi atendida no studio? Conte como foi — sua avaliação aparece aqui depois de conferida.",
    botao: "Deixar minha avaliação"
  },

  local: {
    rotulo: "Onde ficamos",
    titulo: "Venha tomar<br>um café."
  },

  final: {
    rotulo: "Agendamento",
    titulo: "Vamos marcar<br><em>a sua?</em>",
    texto: "Me chame no WhatsApp com o serviço que você quer e eu te mando os horários livres da semana.",
    botao: "Falar com o studio"
  },

  contato: {
    whatsapp: "5593991797198",
    whatsappTexto: "(93) 9179-7198",
    mensagem: "Olá! Vim pelo site e gostaria de agendar um horário no Studio JK Beauty.",
    instagram: "https://www.instagram.com/karine_portela18/",
    instagramUsuario: "@karine_portela18",
    mapsLink: "https://maps.app.goo.gl/swacNG6UWE5VuZDo9",
    mapsBusca: "Studio JK Beauty, Santarém, PA",
    endereco: "Santarém · PA",
    horario: "Segunda a sábado, com hora marcada"
  },

  aparencia: {
    corFundo:    "#F7F2EE",
    corTexto:    "#241C1A",
    corPrimaria: "#9E5F63",
    corDourada:  "#C8A86B",
    corEscura:   "#2A1D22",
    fonteTitulos: "Fraunces",
    fonteTexto:   "Jost",
    tamanhoBase:  16,
    escalaTitulos: 1
  },

  /* "" = moldura com o monograma JK
     "midia:ID" = foto enviada pelo painel
     "https://..." = foto hospedada em outro lugar */
  imagens: { hero: "", sobre: "", s1: "", s2: "", s3: "", s4: "" },
  galeriaFotos: ["", "", "", "", "", "", "", ""],

  letreiro: ["Manicure", "Pedicure", "Unhas em gel", "Alongamento", "Nail Art", "Francesinha", "Blindagem"]
};

/* Fontes disponíveis no painel.
   "q" é o pedaço exato que vai na URL do Google Fonts — cada família
   tem os pesos que realmente existem, senão o Google recusa o pedido. */
export const FONTES_TITULO = [
  { nome: "Fraunces",           q: "Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700" },
  { nome: "Cormorant Garamond", q: "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400" },
  { nome: "Playfair Display",   q: "Playfair+Display:ital,wght@0,400;0,500;0,600;1,400" },
  { nome: "DM Serif Display",   q: "DM+Serif+Display:ital@0;1" },
  { nome: "Marcellus",          q: "Marcellus" },
  { nome: "Prata",              q: "Prata" },
  { nome: "Italiana",           q: "Italiana" }
];
export const FONTES_TEXTO = [
  { nome: "Jost",        q: "Jost:wght@200;300;400;500;600" },
  { nome: "Poppins",     q: "Poppins:wght@200;300;400;500;600" },
  { nome: "Montserrat",  q: "Montserrat:wght@200;300;400;500;600" },
  { nome: "Raleway",     q: "Raleway:wght@200;300;400;500;600" },
  { nome: "Work Sans",   q: "Work+Sans:wght@200;300;400;500;600" },
  { nome: "Nunito Sans", q: "Nunito+Sans:wght@200;300;400;500;600" },
  { nome: "Inter",       q: "Inter:wght@200;300;400;500;600" },
  { nome: "Lato",        q: "Lato:wght@300;400;700" }
];

/* Monta a URL do Google Fonts para o par escolhido */
export function urlDasFontes(nomeTitulo, nomeTexto){
  const t = FONTES_TITULO.find(f => f.nome === nomeTitulo) || FONTES_TITULO[0];
  const c = FONTES_TEXTO.find(f => f.nome === nomeTexto)   || FONTES_TEXTO[0];
  return `https://fonts.googleapis.com/css2?family=${t.q}&family=${c.q}&display=swap`;
}

/* Lê um caminho tipo "sobre.pontos.0.titulo" dentro de um objeto */
export const valorEm = (obj, caminho) =>
  caminho.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

/* Junta o que veio do banco com o padrão, sem perder campos novos */
export function mesclar(padrao, salvo){
  if(Array.isArray(padrao)) return Array.isArray(salvo) ? salvo : padrao;
  if(padrao && typeof padrao === "object"){
    const saida = {};
    for(const k of new Set([...Object.keys(padrao), ...Object.keys(salvo || {})])){
      saida[k] = (salvo && k in salvo) ? mesclar(padrao[k], salvo[k]) : padrao[k];
    }
    return saida;
  }
  return salvo === undefined ? padrao : salvo;
}

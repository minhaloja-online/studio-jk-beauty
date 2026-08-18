/* ============================================================
   CAMADA DE DADOS — Firebase (Auth + Firestore)
   Tudo que fala com o banco passa por aqui.

   Coleções usadas:
     config/site        → textos, cores, fontes, contatos, fotos
     midia/{id}         → fotos enviadas pelo painel (comprimidas)
     reviews/{id}       → avaliações das clientes
     admins/{uid}       → quem pode entrar no painel
     meta/bootstrap     → trava do primeiro acesso
   ============================================================ */
import { CHAVES_FIREBASE, VERSAO_SDK } from "./chaves.js";

const base = `https://www.gstatic.com/firebasejs/${VERSAO_SDK}`;

const [App, Auth, DB] = await Promise.all([
  import(`${base}/firebase-app.js`),
  import(`${base}/firebase-auth.js`),
  import(`${base}/firebase-firestore.js`)
]);

const app  = App.initializeApp(CHAVES_FIREBASE);
export const auth = Auth.getAuth(app);
export const db   = DB.getFirestore(app);

const {
  doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, collection,
  getDocs, query, where, orderBy, serverTimestamp, writeBatch, limit
} = DB;

const {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
  updatePassword, setPersistence, browserLocalPersistence
} = Auth;

await setPersistence(auth, browserLocalPersistence);

/* ---------- CONFIGURAÇÃO DO SITE ---------- */

export async function lerConfig(){
  const s = await getDoc(doc(db, "config", "site"));
  return s.exists() ? s.data() : null;
}

export async function salvarConfig(dados){
  await setDoc(doc(db, "config", "site"), dados);
}

/* ---------- FOTOS ----------
   Guardadas como imagem comprimida dentro do Firestore.
   Cada foto vira um documento em midia/{id}, bem abaixo do
   limite de 1 MB por documento.                                */

export async function lerMidia(id){
  const s = await getDoc(doc(db, "midia", id));
  return s.exists() ? s.data().dados : null;
}

export async function lerVariasMidias(ids){
  const unicos = [...new Set(ids)].filter(Boolean);
  const pares = await Promise.all(unicos.map(async id => {
    try { return [id, await lerMidia(id)]; } catch { return [id, null]; }
  }));
  return Object.fromEntries(pares.filter(([, v]) => v));
}

export async function guardarMidia(dataUrl){
  const ref = await addDoc(collection(db, "midia"), {
    dados: dataUrl,
    criadoEm: serverTimestamp()
  });
  return "midia:" + ref.id;
}

export async function apagarMidia(referencia){
  if(!referencia?.startsWith("midia:")) return;
  try { await deleteDoc(doc(db, "midia", referencia.slice(6))); } catch {}
}

/* Resolve "midia:ID" para a imagem; URLs comuns passam direto. */
export function resolverFoto(referencia, cache){
  if(!referencia) return "";
  if(referencia.startsWith("midia:")) return cache?.[referencia.slice(6)] || "";
  return referencia;
}
export const idsDeMidia = (lista) =>
  lista.filter(r => typeof r === "string" && r.startsWith("midia:")).map(r => r.slice(6));

/* ---------- AVALIAÇÕES ---------- */

export async function avaliacoesAprovadas(){
  const q = query(collection(db, "reviews"), where("aprovado", "==", true), limit(60));
  const r = await getDocs(q);
  return r.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
}

export async function todasAvaliacoes(){
  const r = await getDocs(collection(db, "reviews"));
  return r.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
}

export async function enviarAvaliacao({ nome, nota, texto }){
  await addDoc(collection(db, "reviews"), {
    nome: nome.slice(0, 40),
    nota: Number(nota),
    texto: texto.slice(0, 400),
    aprovado: false,
    criadoEm: serverTimestamp()
  });
}

export const aprovarAvaliacao = (id, valor = true) =>
  updateDoc(doc(db, "reviews", id), { aprovado: valor });

export const excluirAvaliacao = (id) => deleteDoc(doc(db, "reviews", id));

/* ---------- AGENDA ----------
   agendamentos/{id}   → ocupação do horário. Leitura pública, porque o
                         site precisa saber o que já está tomado.
                         Guarda profissionalId, data, início, fim, serviço
                         e situação — nada que identifique a cliente.
   agendamentos/{id}/privado/cliente → nome e telefone. Só a profissional
                         daquela agenda consegue ler.
   O id é montado como profissionalId_data_hora, então duas pessoas nunca
   criam o mesmo horário por engano.                                      */

const idDoHorario = (pid, data, inicio) => `${pid}_${data}_${inicio.replace(":", "")}`;

/** Agendamentos de uma profissional num dia (para montar a grade livre). */
export async function agendaDoDia(profissionalId, data){
  const q = query(
    collection(db, "agendamentos"),
    where("profissionalId", "==", profissionalId),
    where("data", "==", data)
  );
  const r = await getDocs(q);
  return r.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Agendamentos de uma profissional num período (agenda do painel). */
export async function agendaEntre(profissionalId, inicio, fim){
  const q = query(
    collection(db, "agendamentos"),
    where("profissionalId", "==", profissionalId),
    where("data", ">=", inicio),
    where("data", "<=", fim),
    orderBy("data"),
    limit(400)
  );
  const r = await getDocs(q);
  return r.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Pedidos aguardando validação, de qualquer data — não deixa passar
    um pedido que caiu num mês que a profissional não está olhando.
    Só filtros de igualdade: não precisa de índice combinado. */
export async function pendentesDe(profissionalId){
  const q = query(
    collection(db, "agendamentos"),
    where("profissionalId", "==", profissionalId),
    where("status", "==", "aguardando"),
    limit(100)
  );
  const r = await getDocs(q);
  return r.docs.map(d => ({ id: d.id, ...d.data() }))
               .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
}

/** Cria o pedido de horário. Volta o id para o painel encontrar depois. */
export async function pedirHorario({ profissionalId, data, inicio, fim, duracao,
                                     servico, cliente, telefone, status = "aguardando" }){
  const id = idDoHorario(profissionalId, data, inicio);
  await setDoc(doc(db, "agendamentos", id), {
    profissionalId, data, inicio, fim,
    duracao: Number(duracao),
    servico: String(servico || "").slice(0, 60),
    status,
    criadoEm: serverTimestamp()
  });
  await setDoc(doc(db, "agendamentos", id, "privado", "cliente"), {
    nome: String(cliente || "").slice(0, 60),
    telefone: String(telefone || "").slice(0, 25)
  });
  return id;
}

/** Nome e telefone de quem marcou (só a profissional consegue). */
export async function dadosDaCliente(id){
  try{
    const s = await getDoc(doc(db, "agendamentos", id, "privado", "cliente"));
    return s.exists() ? s.data() : null;
  }catch(e){ return null; }
}

export const mudarStatus = (id, status, extra = {}) =>
  updateDoc(doc(db, "agendamentos", id), { status, ...extra });

export async function apagarAgendamento(id){
  await deleteDoc(doc(db, "agendamentos", id, "privado", "cliente")).catch(() => {});
  await deleteDoc(doc(db, "agendamentos", id));
}

/** Diz ao painel qual profissional é a conta logada (usado nas regras). */
export const definirMinhaProfissional = (uid, profissionalId) =>
  updateDoc(doc(db, "admins", uid), { profissionalId });

/* ---------- CAIXA (entradas e custos) ----------
   Um documento por lançamento em lancamentos/{id}:
     tipo      "receita" (atendimento) ou "despesa" (custo)
     data      "AAAA-MM-DD" — texto, para filtrar e ordenar direto
     valor     número, em reais
     descricao o que foi
     categoria para agrupar os custos
   Só o administrador lê e escreve: é informação do negócio e
   não pode ficar visível para quem abre o site.               */

export async function lancamentosEntre(uid, inicio, fim){
  const q = query(
    collection(db, "admins", uid, "lancamentos"),
    where("data", ">=", inicio),
    where("data", "<=", fim),
    orderBy("data", "desc"),
    limit(600)
  );
  const r = await getDocs(q);
  return r.docs.map(d => ({ id: d.id, uid, ...d.data() }));
}

export async function salvarLancamento(uid, { tipo, data, valor, descricao, categoria }){
  return addDoc(collection(db, "admins", uid, "lancamentos"), {
    tipo,
    data,
    valor: Number(valor),
    descricao: String(descricao || "").trim().slice(0, 120),
    categoria: String(categoria || "").trim().slice(0, 40),
    criadoEm: serverTimestamp()
  });
}

/** Corrige um lançamento já feito (valor, serviço, data, tipo). */
export const atualizarLancamento = (uid, id, dados) =>
  updateDoc(doc(db, "admins", uid, "lancamentos", id), dados);

export const excluirLancamento = (uid, id) =>
  deleteDoc(doc(db, "admins", uid, "lancamentos", id));

/* ---------- ACESSO AO PAINEL ---------- */

/** Já existe administrador? (leitura pública, usada na tela de login) */
export async function jaTemAdmin(){
  const s = await getDoc(doc(db, "meta", "bootstrap"));
  return s.exists();
}

export const entrar = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
export const sair = () => signOut(auth);
export const recuperarSenha = (email) => sendPasswordResetEmail(auth, email);
export const trocarSenha = (nova) => updatePassword(auth.currentUser, nova);
export const aoMudarLogin = (fn) => onAuthStateChanged(auth, fn);

/** Cria a conta do PRIMEIRO administrador e fecha a porta atrás de si.
    As duas gravações vão juntas: se a trava já existir, tudo falha. */
export async function criarPrimeiroAdmin(email, senha){
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  const lote = writeBatch(db);
  lote.set(doc(db, "admins", cred.user.uid), { email, papel: "dona", criadoEm: serverTimestamp() });
  lote.set(doc(db, "meta", "bootstrap"), { criadoEm: serverTimestamp() });
  await lote.commit();
  return cred.user;
}

/** Dados da conta logada: nome, papel e a qual profissional pertence. */
export async function meuPerfil(uid){
  const s = await getDoc(doc(db, "admins", uid));
  return s.exists() ? { uid, ...s.data() } : null;
}

/** Todas as contas com acesso ao painel (só a dona consegue ler). */
export async function listarAcessos(){
  const r = await getDocs(collection(db, "admins"));
  return r.docs.map(d => ({ uid: d.id, ...d.data() }));
}

/** Cria o login da segunda profissional sem derrubar a sessão de quem
    está logada: a conta nasce num app secundário, isolado deste. */
export async function criarAcessoProfissional({ email, senha, nome, profissionalId }){
  const { initializeApp, deleteApp } = App;
  const { getAuth, createUserWithEmailAndPassword, signOut: sair2 } = Auth;

  const app2 = initializeApp(CHAVES_FIREBASE, "criador-" + Date.now());
  const auth2 = getAuth(app2);
  try{
    const cred = await createUserWithEmailAndPassword(auth2, email, senha);
    try{
      await setDoc(doc(db, "admins", cred.user.uid), {
        email, nome, profissionalId, papel: "profissional", criadoEm: serverTimestamp()
      });
    }catch(e){
      // a conta de login já existe, mas não foi ligada ao painel.
      // Devolve o UID para dar para vincular sem criar tudo de novo.
      e.uidCriado = cred.user.uid;
      throw e;
    }
    await sair2(auth2);
    return cred.user.uid;
  }finally{
    await deleteApp(app2);
  }
}

/** Liga uma conta já criada no Console do Firebase a uma profissional. */
export async function vincularAcesso({ uid, email, nome, profissionalId }){
  await setDoc(doc(db, "admins", uid.trim()), {
    email, nome, profissionalId, papel: "profissional", criadoEm: serverTimestamp()
  }, { merge: true });
}

export const removerAcesso = (uid) => deleteDoc(doc(db, "admins", uid));

export async function ehAdmin(uid){
  if(!uid) return false;
  try { return (await getDoc(doc(db, "admins", uid))).exists(); }
  catch { return false; }
}

/* ---------- MENSAGENS DE ERRO EM PORTUGUÊS ---------- */
export function explicarErro(e){
  const c = e?.code || "";
  const mapa = {
    /* ---- senha / conta ---- */
    "auth/invalid-credential":  "E-mail ou senha não conferem.",
    "auth/invalid-email":       "Esse e-mail não parece válido.",
    "auth/user-not-found":      "Não existe conta com esse e-mail.",
    "auth/wrong-password":      "Senha incorreta.",
    "auth/missing-password":    "Digite a senha.",
    "auth/user-disabled":       "Esta conta foi desativada no Firebase.",
    "auth/weak-password":       "A senha precisa ter pelo menos 6 caracteres.",
    "auth/email-already-in-use":"Já existe uma conta com esse e-mail.",
    "auth/too-many-requests":   "Muitas tentativas seguidas. Espere alguns minutos.",
    "auth/network-request-failed":"Sem conexão com a internet.",
    "auth/requires-recent-login":"Por segurança, saia e entre de novo antes de trocar a senha.",

    /* ---- configuração que falta no Console do Firebase ---- */
    "auth/unauthorized-domain":
      "Este endereço não está liberado. No Firebase: Authentication → Settings → Domínios autorizados → adicione minhaloja-online.github.io",
    "auth/operation-not-allowed":
      "O login por e-mail e senha está desligado. No Firebase: Authentication → Sign-in method → ative E-mail/senha.",
    "auth/configuration-not-found":
      "A Autenticação ainda não foi ativada neste projeto. No Firebase: Authentication → Vamos começar → ative E-mail/senha.",
    "auth/admin-restricted-operation":
      "O cadastro de novos usuários está bloqueado. No Firebase: Authentication → Settings → User actions.",
    "auth/invalid-api-key":     "A apiKey em assets/chaves.js está errada.",
    "auth/api-key-not-valid":   "A apiKey em assets/chaves.js está errada.",
    "auth/invalid-app-id":      "O appId em assets/chaves.js está errado.",
    "auth/internal-error":      "O Firebase recusou o pedido. Confira as chaves e se a Autenticação está ativada.",

    /* ---- banco de dados ---- */
    "permission-denied":
      "As regras do Firestore não liberaram esta ação. Confira se você publicou o firestore.rules no Console.",
    "unavailable":              "O banco de dados não respondeu. Tente de novo.",
    "failed-precondition":      "O Firestore ainda não foi criado neste projeto."
  };
  if(mapa[c]) return mapa[c];

  // o Firebase às vezes anexa a frase inteira ao código; casa pelo começo
  const parecido = Object.keys(mapa).find(k => c.startsWith(k));
  if(parecido) return mapa[parecido];
  // sem tradução: mostra o código para dar para investigar sem abrir o console
  return `Algo deu errado${c ? ` (código: ${c})` : ""}. ${e?.message || ""}`.trim();
}

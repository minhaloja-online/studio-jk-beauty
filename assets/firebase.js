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
  getDocs, query, where, serverTimestamp, writeBatch, limit
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
  lote.set(doc(db, "admins", cred.user.uid), { email, criadoEm: serverTimestamp() });
  lote.set(doc(db, "meta", "bootstrap"), { criadoEm: serverTimestamp() });
  await lote.commit();
  return cred.user;
}

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
  // sem tradução: mostra o código para dar para investigar sem abrir o console
  return `Algo deu errado${c ? ` (código: ${c})` : ""}. ${e?.message || ""}`.trim();
}

/* ============================================================
   CHAVES DO FIREBASE
   Cole aqui o objeto que o Firebase mostra em:
   Console → ⚙️ Configurações do projeto → Seus apps → Web → Configuração do SDK
   Estas chaves são públicas por natureza — quem protege os dados
   são as regras do Firestore (arquivo firestore.rules).
   ============================================================ */
export const CHAVES_FIREBASE = {
  apiKey:            "COLE_AQUI",
  authDomain:        "studio-jk-beauty.firebaseapp.com",
  projectId:         "studio-jk-beauty",
  storageBucket:     "studio-jk-beauty.firebasestorage.app",
  messagingSenderId: "COLE_AQUI",
  appId:             "COLE_AQUI"
};

/* Versão do SDK do Firebase. Se um dia precisar atualizar,
   troque só este número — ele vale para o site e para o painel. */
export const VERSAO_SDK = "12.17.1";

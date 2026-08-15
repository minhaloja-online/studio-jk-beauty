/* ============================================================
   CHAVES DO FIREBASE
   Cole aqui o objeto que o Firebase mostra em:
   Console → ⚙️ Configurações do projeto → Seus apps → Web → Configuração do SDK
   Estas chaves são públicas por natureza — quem protege os dados
   são as regras do Firestore (arquivo firestore.rules).
   ============================================================ */
export const CHAVES_FIREBASE = {
  apiKey:            "AIzaSyDYnXHgZl--7Wt79xFXPJwh3VRFc9uSuZM",
  authDomain:        "studio-jk-beauty.firebaseapp.com",
  projectId:         "studio-jk-beauty",
  storageBucket:     "studio-jk-beauty.firebasestorage.app",
  messagingSenderId: "489243570074",
  appId:             "1:489243570074:web:11728704a28032ece49423"
};

/* Versão do SDK do Firebase. Se um dia precisar atualizar,
   troque só este número — ele vale para o site e para o painel. */
export const VERSAO_SDK = "12.17.1";

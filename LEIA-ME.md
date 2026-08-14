# Studio JK Beauty

Site institucional com painel de administração. Sem build, sem npm — HTML, CSS e JavaScript puros usando Firebase.

```
index.html            página do site
admin.html            painel do administrador
assets/
  chaves.js           ← as chaves do Firebase vão AQUI
  firebase.js         tudo que fala com o banco
  padrao.js           conteúdo padrão + fontes disponíveis
  site.js             motor da página
  estilo.css          visual do site
firestore.rules       regras de segurança do banco
```

---

## Passo 1 — Criar o projeto no Firebase

1. Acesse <https://console.firebase.google.com> → **Adicionar projeto** → nome `studio-jk-beauty`.
2. Pode desligar o Google Analytics (não é usado aqui).
3. Dentro do projeto: **Criar** → ícone `</>` (Web) → apelido `site` → **Registrar app**.
4. O Firebase mostra um objeto `firebaseConfig`. Copie os valores.

## Passo 2 — Colar as chaves

Abra `assets/chaves.js` e substitua os `COLE_AQUI` pelos valores que apareceram:

```js
export const CHAVES_FIREBASE = {
  apiKey:            "AIza...",
  authDomain:        "studio-jk-beauty.firebaseapp.com",
  projectId:         "studio-jk-beauty",
  storageBucket:     "studio-jk-beauty.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId:             "1:1234567890:web:abc123"
};
```

Essas chaves são públicas por natureza — elas apenas identificam o projeto. Quem protege os dados são as regras do Passo 4.

## Passo 3 — Ligar Autenticação e Firestore

**Authentication** → *Vamos começar* → aba **Sign-in method** → ative **E-mail/senha** → Salvar.

**Firestore Database** → *Criar banco de dados* → região **southamerica-east1 (São Paulo)** → comece em **modo de produção** (as regras certas vêm no próximo passo).

## Passo 4 — Publicar as regras de segurança

Firestore Database → aba **Regras** → apague o que estiver lá → cole o conteúdo de `firestore.rules` → **Publicar**.

Sem esse passo o painel não consegue salvar nada, e sem ele o banco fica aberto. Não pule.

## Passo 5 — Publicar o site

**GitHub Pages:** envie os arquivos para o repositório `studio-jk-beauty` → Settings → Pages → Source: `Deploy from a branch` → branch `main`, pasta `/ (root)` → Save. O endereço sai em `https://SEU-USUARIO.github.io/studio-jk-beauty/`.

**Vercel:** New Project → importe o repositório → Framework: `Other` → Deploy.

Depois de publicar, volte no Firebase em **Authentication → Settings → Domínios autorizados** e adicione o domínio do site (o `github.io` ou o `vercel.app`). Sem isso o login não funciona.

> Para testar na sua máquina, não abra o `index.html` com dois cliques — os módulos JavaScript não funcionam em `file://`. Rode `npx serve` na pasta do projeto e acesse o endereço que ele mostrar.

## Passo 6 — Criar sua conta e fechar a porta ⚠️

1. Acesse `SEU-SITE/admin.html`.
2. Como ainda não existe nenhum administrador, a tela oferece **criar a conta**. Use um e-mail que você controla e uma senha forte.
3. Assim que a conta é criada, o sistema grava uma trava (`meta/bootstrap`) e **nunca mais** aceita um segundo cadastro pelo site.
4. Logo em seguida, vá em **Authentication → Settings → User actions** e desmarque **Enable create (sign-up)**.

**Por que a pressa:** entre publicar o site e criar sua conta, existe uma janela em que qualquer pessoa que descubra o endereço `/admin.html` pode se cadastrar e virar dona do painel. Faça o passo 5 e o 6 na mesma sessão.

Para adicionar outro administrador depois (a Karine, por exemplo):

1. Authentication → **Add user** → crie o e-mail e a senha dela.
2. Copie o **UID** que aparece na lista.
3. Firestore → coleção `admins` → **Adicionar documento** → ID do documento = o UID → campo `email` (string) com o e-mail dela.

---

## Como o conteúdo funciona

Enquanto nada foi salvo no painel, o site usa o conteúdo de `assets/padrao.js`. Assim que você salva pela primeira vez, tudo passa a vir do documento `config/site` no Firestore — e o padrão vira apenas a rede de segurança e o que o botão **Restaurar padrão** devolve.

**Fotos.** O painel comprime cada imagem no navegador e guarda dentro do próprio Firestore, sem precisar do Cloud Storage (que hoje exige plano pago). Funciona bem para as ~15 fotos do site. Se um dia a galeria crescer muito, coloque as imagens numa pasta `assets/fotos/` do repositório e, no painel, informe o caminho (`./assets/fotos/unha-01.jpg`) em vez de enviar o arquivo — os campos aceitam tanto foto enviada quanto endereço.

**Avaliações.** A cliente envia pelo site e o comentário entra como *pendente*. Nada aparece na página antes de você aprovar na aba **Avaliações**. A média com estrelas no topo da seção é calculada só com as aprovadas.

---

## Custos

Tudo cabe no plano gratuito (Spark) do Firebase: 50 mil leituras e 20 mil gravações por dia, 1 GB de banco e 10 GB de tráfego por mês. Um site desse porte usa uma fração disso. Não é preciso cadastrar cartão.

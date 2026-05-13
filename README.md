# 🏢 Gestão Empresarial

App completo de gestão com Finanças, Estoque, Clientes, Vendas e Fichas.  
Construído com **React + Vite + Firebase Firestore**, pronto para deploy na **Vercel**.

---

## 📁 Estrutura do projeto

```
gestao-empresarial/
├── src/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── UI.jsx          ← componentes reutilizáveis (Card, Badge, Btn…)
│   │   │   └── Sidebar.jsx     ← menu lateral
│   │   ├── Financas/Financas.jsx
│   │   ├── Estoque/Estoque.jsx
│   │   ├── Clientes/Clientes.jsx
│   │   ├── Vendas/Vendas.jsx
│   │   └── Fichas/Fichas.jsx
│   ├── context/
│   │   └── ToastContext.jsx    ← notificações globais
│   ├── lib/
│   │   ├── firebase.js         ← inicialização do Firebase
│   │   ├── firestore.js        ← helpers CRUD (subscribe, add, update, delete)
│   │   └── utils.js            ← fmt, fmtQ, today, uid
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Passo a passo: do zero ao ar

### 1. Criar o projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"** → dê um nome (ex: `gestao-empresarial`) → Continuar
3. Desative o Google Analytics (não precisa) → **Criar projeto**
4. No menu lateral, clique em **Firestore Database** → **Criar banco de dados**
5. Escolha **"Iniciar no modo de teste"** → Avançar → selecione a região (ex: `southamerica-east1`) → **Ativar**

#### Configurar as regras do Firestore (modo teste por 30 dias):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // altere depois para adicionar autenticação
    }
  }
}
```

6. No menu lateral, clique em ⚙️ **Configurações do projeto** → aba **Geral**
7. Role até **"Seus apps"** → clique no ícone **`</>`** (Web)
8. Dê um apelido (ex: `gestao-web`) → **Registrar app**
9. Copie o bloco `firebaseConfig` — você vai precisar dos valores abaixo

---

### 2. Configurar variáveis de ambiente locais

Na raiz do projeto, crie um arquivo **`.env`** (nunca commite este arquivo):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=gestao-empresarial.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gestao-empresarial
VITE_FIREBASE_STORAGE_BUCKET=gestao-empresarial.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

Copie os valores do `firebaseConfig` que você copiou no passo anterior.

---

### 3. Rodar localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` — o app já estará conectado ao Firebase!

---

### 4. Publicar na Vercel

#### 4a. Subir o código para o GitHub

```bash
# Na raiz do projeto
git init
git add .
git commit -m "primeiro commit"

# Crie um repositório no github.com (sem README)
# Depois conecte:
git remote add origin https://github.com/seu-usuario/gestao-empresarial.git
git branch -M main
git push -u origin main
```

#### 4b. Fazer o deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) → **Sign up with GitHub**
2. Clique em **"Add New Project"**
3. Importe o repositório `gestao-empresarial`
4. A Vercel detecta Vite automaticamente. Não altere nada em Framework/Build.
5. Antes de clicar em Deploy, clique em **"Environment Variables"** e adicione **uma por uma**:

| Nome                              | Valor (do seu firebaseConfig)     |
|-----------------------------------|-----------------------------------|
| `VITE_FIREBASE_API_KEY`           | AIzaSy...                         |
| `VITE_FIREBASE_AUTH_DOMAIN`       | gestao-empresarial.firebaseapp.com|
| `VITE_FIREBASE_PROJECT_ID`        | gestao-empresarial                |
| `VITE_FIREBASE_STORAGE_BUCKET`    | gestao-empresarial.appspot.com    |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 123456789                       |
| `VITE_FIREBASE_APP_ID`            | 1:123456789:web:abcdef123456      |

6. Clique em **Deploy** ✅
7. Em ~1 minuto você recebe um link como `https://gestao-empresarial-xyz.vercel.app`

---

### 5. Atualizações futuras

Toda vez que fizer mudanças e quiser atualizar no ar:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

A Vercel faz o redeploy automaticamente! 🔄

---

## 🔒 Segurança (recomendado após testar)

O modo de teste do Firestore expira em 30 dias. Para proteger seus dados, adicione
autenticação (Firebase Auth) ou restrinja as regras. Exemplo básico com e-mail/senha:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📦 Funcionalidades

- 💰 **Finanças** — fluxo de caixa, lançamentos manuais e automáticos (via vendas e fichas)
- 📦 **Estoque** — produtos com duas tabelas de preço, unidade de medida, fracionamento
- 👤 **Clientes** — cadastro com classificação Tabela 1 (final) / Tabela 2 (revenda)
- 🛒 **Vendas** — carrinho com múltiplos itens, desconto por item (% ou R$), integração automática com estoque e financeiro
- 📋 **Fichas** — vendas a prazo que só entram no financeiro ao confirmar recebimento

Todos os dados são sincronizados em **tempo real** entre dispositivos via Firebase Firestore.

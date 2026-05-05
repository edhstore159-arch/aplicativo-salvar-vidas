# 🚀 Deploy ServiVizinhos no Render — Guia Final (testado)

## ⚠️ Erros que apareceram nos seus deploys e como evitá-los agora

| Erro real visto | Causa | Status |
|----------------|-------|--------|
| `ResolutionImpossible: grpcio-status vs protobuf` | requirements.txt tinha 124 deps em conflito | ✅ Corrigido (12 deps essenciais) |
| Build Command truncado: `yarn install && yarn` | Faltou `build` no final do comando | ⚠️ Atenção no Passo 4 |
| Login não entra no site no ar | `REACT_APP_BACKEND_URL` errada (CRA embute em build-time) | ⚠️ Atenção no Passo 5 |
| Múltiplos sites duplicados | Vários blueprints recriados | 🗑️ Apague duplicados antes de começar |

---

## ✅ Passo a passo (15 minutos)

### **🪜 PASSO 1 — Limpar serviços antigos no Render**

1. https://dashboard.render.com → entre em cada serviço antigo
2. **Settings** → role até embaixo → **Delete or suspend** → **Delete**
3. Apague TODOS os duplicados (`servizinho`, `servicos-de-vizinhos-novo-melhorado-1`, etc)

⚠️ Mantenha apenas se tiver um backend que **já está funcionando** com `MONGO_URL` ok.

---

### **🪜 PASSO 2 — Criar MongoDB grátis (M0)**

1. https://cloud.mongodb.com → **Sign in / Try free**
2. **+ Create** → escolha **M0 (FREE)**
3. Provider: **AWS** | Region: **São Paulo (sa-east-1)** ou **N. Virginia**
4. **Create Deployment**
5. Username: `servivizinhos` → **Autogenerate Secure Password** → **anote a senha**
6. **Create Database User**
7. Lateral → **Network Access** → **+ ADD IP ADDRESS** → **ALLOW ACCESS FROM ANYWHERE** (`0.0.0.0/0`) → Confirm
8. Lateral → **Database** → **Connect** → **Drivers** → copie a string
9. Substitua `<db_password>` pela senha real:
   ```
   mongodb+srv://servivizinhos:SUA_SENHA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

📋 **Guarde essa string completa** — vai usar no Passo 4.

---

### **🪜 PASSO 3 — Subir código atualizado pro GitHub**

No Emergent, clique em **"Save to GitHub"** no chat. Confirme que estes arquivos estão no repo:

- `render.yaml` (na raiz)
- `backend/requirements.txt` (apenas ~12 linhas)
- `frontend/package.json`
- `DEPLOY_RENDER.md` (este guia)

---

### **🪜 PASSO 4 — Criar Backend (Web Service Python)**

1. Render Dashboard → **+ New** → **Web Service**
2. Conecte o GitHub e selecione o repositório
3. Configure **EXATAMENTE assim**:

| Campo | Valor |
|-------|-------|
| **Name** | `servivizinhos-backend` |
| **Region** | `Oregon` ou `Virginia` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| **Plan** | `Free` |

4. Role até **Environment Variables** e adicione **uma por uma**:

| Key | Value |
|-----|-------|
| `MONGO_URL` | (cole a string do Passo 2) |
| `DB_NAME` | `servivizinhos` |
| `SECRET_KEY` | (qualquer string longa aleatória, ex: `s7Hg3kP9wM2aB6xQ`) |
| `CORS_ORIGINS` | `*` |
| `PYTHON_VERSION` | `3.11.0` |

5. Clique em **Create Web Service**
6. Aguarde ~3 min até aparecer status **Live** (bolinha verde)

✅ **Teste**: abra `https://servivizinhos-backend.onrender.com/api/`
Resposta esperada:
```json
{"message":"AlloVoisins Clone API is running","version":"1.0.0"}
```

📋 **Anote a URL exata do backend** (o Render pode adicionar sufixo se já existir).

---

### **🪜 PASSO 5 — Criar Frontend (Static Site)**

1. Render Dashboard → **+ New** → **Static Site**
2. Selecione o mesmo repositório
3. Configure **EXATAMENTE assim**:

| Campo | Valor |
|-------|-------|
| **Name** | `servivizinhos-app` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `yarn install --frozen-lockfile && yarn build` |
| **Publish Directory** | `build` |

⚠️ **CUIDADO no Build Command**: ele PRECISA terminar com `&& yarn build`. Se cortar (`yarn install && yarn`) o site fica em branco.

4. Antes de Create Site, role até **Environment Variables** → **Add**:

| Key | Value |
|-----|-------|
| `REACT_APP_BACKEND_URL` | (URL do Passo 4, ex: `https://servivizinhos-backend.onrender.com`) |
| `NODE_VERSION` | `18.17.0` |

⚠️ **NÃO COLOQUE BARRA `/` NO FINAL DA URL**. Errado: `.../onrender.com/`. Certo: `.../onrender.com`.

5. **Create Static Site** → aguarde build (~3 min)

---

### **🪜 PASSO 6 — Configurar Rewrite (CRÍTICO!)**

Sem isso, ao recarregar `/feed` ou `/mensagens` aparece **404**.

1. No serviço frontend → menu lateral **Redirects/Rewrites**
2. **Add Rule**:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: **Rewrite**
3. **Save**

Depois clique em **Manual Deploy → Deploy latest commit** para reconstruir.

---

### **🪜 PASSO 7 — Testar tudo**

1. Abra `https://servivizinhos-app.onrender.com`
2. **F12 → Console** deve aparecer:
   ```
   [ServiVizinhos] Backend URL: https://servivizinhos-backend.onrender.com
   ```
3. Clique em **Cadastrar-se** → preencha:
   - Nome, Email, Senha (mínimo 6 caracteres)
   - Local: ex. "São Paulo, SP"
4. **Cadastrar** → deve redirecionar para `/feed`
5. Teste: publicar pedido, mandar mensagem, modal de PIX

---

## 🛠️ Troubleshooting

### "Build failed" no backend
Geralmente conflito de dependência. Vá em **Logs** e procure por `ERROR:`.
- Se ver `ResolutionImpossible` → confirme que `requirements.txt` tem só ~12 linhas (não as 124 antigas)
- Se ver `Module not found` → algum import quebrado

### Login dá "Network Error" no console
- O backend está dormindo (cold start). Aguarde 30-50s e tente de novo
- Ou `REACT_APP_BACKEND_URL` está errada → corrija e **Manual Deploy** o frontend

### Login dá CORS error
- Backend → Environment → confirme `CORS_ORIGINS=*`
- Reinicie o backend (`Manual Deploy → Clear build cache & deploy`)

### Tela branca no frontend
- Build Command está cortado. Vá em frontend → Settings → Build → Edit → corrija para `yarn install --frozen-lockfile && yarn build` → Save → Manual Deploy

### "404 Not Found" ao recarregar /feed
- Faltou o Rewrite Rule do Passo 6

---

## 💰 Custos

| Serviço | Plano Free | Limite |
|---------|-----------|--------|
| Render Backend | Grátis | Dorme após 15min inatividade (50s cold start) |
| Render Frontend | Grátis | 100 GB bandwidth/mês |
| MongoDB Atlas | M0 Grátis | 512 MB storage |
| **TOTAL** | **R$ 0,00** | — |

Para **eliminar o cold start**: upgrade Render Starter ($7/mês) OU configure **UptimeRobot** (https://uptimerobot.com — grátis) pingando `https://servivizinhos-backend.onrender.com/api/` a cada 5 minutos.

---

## 📌 Configuração final correta (cheat sheet)

### Backend → Settings
```
Root Directory:   backend
Build Command:    pip install --upgrade pip && pip install -r requirements.txt
Start Command:    uvicorn server:app --host 0.0.0.0 --port $PORT
Health Check:     /api/
```

### Backend → Environment
```
MONGO_URL=mongodb+srv://...
DB_NAME=servivizinhos
SECRET_KEY=...
CORS_ORIGINS=*
PYTHON_VERSION=3.11.0
```

### Frontend → Settings
```
Root Directory:    frontend
Build Command:     yarn install --frozen-lockfile && yarn build
Publish Directory: build
```

### Frontend → Environment
```
REACT_APP_BACKEND_URL=https://servivizinhos-backend.onrender.com
NODE_VERSION=18.17.0
```

### Frontend → Redirects/Rewrites
```
Source:      /*
Destination: /index.html
Action:      Rewrite
```

---

**Pronto!** Siga os 7 passos na ordem e seu app vai pro ar sem erro. 🎉

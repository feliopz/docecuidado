# Doce Cuidado

**Equipe Synapse** — estudantes do IFMG
Desafio **CI-IA Saúde** (Centro de Inovação em Inteligência Artificial para a Saúde, UFMG)

App-companheiro para famílias de crianças com diabetes (foco em DM1). Diário de cuidados, orientação com IA, receitas, modo crise e visão para médicos/cuidadores.

> *"No dia normal, o app conversa. No pânico, o app comanda."*

**Status:** MVP funcional · Supabase em produção · build Android (EAS) em andamento  
**Repositório:** https://github.com/feliopz/docecuidado  
---

## O que já está pronto

| Área | Status |
|------|--------|
| Onboarding (responsável, cuidador, médico) | ✅ |
| Registro de glicemia, insulina e nutrição (câmera + IA) | ✅ |
| Diário, gráficos, relatórios PDF | ✅ |
| Modo crise + ligação 192 | ✅ |
| Aprender (lições + quiz) | ✅ |
| Receitas (50 no Supabase + recomendação por IA) | ✅ |
| Multi-criança, convites, visão médico | ✅ |
| Auth Supabase + migração local → nuvem | ✅ |
| Notificações locais (lembretes de glicemia) | ✅ |
| Assets (Gotinha) + ícones Android/iOS | ✅ |
| Schema SQL + seeds documentados | ✅ |

**Antes da Play Store:** verificação da conta Google Play, política de privacidade (URL), testes no APK/AAB real, disclaimers finais de compliance.

---

## Stack

- **App:** React Native 0.81 + Expo SDK 54 + Expo Router 6 + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth)
- **IA:** OpenRouter (texto + visão para OCR de glicosímetro e análise de refeições)
- **Build:** EAS (`eas.json` em `src/`)
- **Posicionamento:** Health & Fitness (não dispositivo médico)

---

## Estrutura do repositório

```
doce-cuidado/
├── README.md
├── DOCS_INDEX.md              # índice da documentação
├── docs/                      # produto, arquitetura, compliance, SQL, receitas
├── assets/                    # imagens originais (GPT) — fonte dos ícones
├── scripts/                   # EAS build, seed de receitas
├── tools/                     # painel HTML admin de receitas
└── src/                       # ← app Expo (código executável)
    ├── app/                   # rotas (expo-router)
    ├── components/
    ├── lib/                   # store, supabase, auth, llm, notifications
    ├── assets/                # ícones PNG processados + marketing
    ├── app.json
    ├── eas.json
    └── package.json
```

O código do app fica em **`src/`**, não na raiz do repo.

---

## Desenvolvimento local

### Pré-requisitos

- Node.js 20+ (recomendado para Expo 54)
- npm

### Setup

```bash
git clone https://github.com/feliopz/docecuidado.git
cd docecuidado/src

npm install --legacy-peer-deps

# Variáveis do app (criar src/.env.local):
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_ANON_KEY=
# EXPO_PUBLIC_OPENROUTER_API_KEY=

npm start          # Expo Go
npm run android    # emulador / device
```

> **Notificações:** lembretes locais só funcionam de forma confiável em **build nativo** (APK/AAB), não no Expo Go.

### Variáveis de ambiente

| Arquivo | Uso |
|---------|-----|
| `src/.env.local` | Chaves do app (Expo) — **não commitar** |
| `.env` (raiz) | Opcional: MCP Supabase local |
| `.env.example` | Modelo sem segredos |

---

## Supabase

Scripts em `docs/`:

1. `docs/supabase-schema.sql` — tabelas principais
2. `docs/supabase-recipes-seed.sql` — tabela `recipes` + receitas iniciais

Gerenciar receitas depois: abrir `tools/recipes-admin.html` no navegador (usar `service_role` apenas em ambiente seguro).

---

## Build Android (EAS)

Comandos sempre a partir de **`src/`**:

```bash
cd src

# login (uma vez)
npx eas-cli login

# projeto já vinculado — ID em app.json → extra.eas.projectId

# APK para testar (notificações, câmera, etc.)
npx eas-cli build --platform android --profile preview

# AAB para Play Store
npx eas-cli build --platform android --profile production
```

Ou da raiz: `bash scripts/eas-build-preview.sh` (requer `EXPO_TOKEN` ou login ativo).

### Regenerar ícones a partir dos PNGs originais

```bash
bash src/assets/generate-assets.sh
```

(Lê de `assets/` na raiz e grava em `src/assets/`.)

---

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [docs/ciia/](docs/ciia/) | **Material do CI-IA**: transcrições, síntese analítica e matriz de rastreabilidade |
| [docs/content/](docs/content/) | **Conteúdo educativo versionado**: lições, quiz e guia de linguagem |
| [docs/AUDITORIA.md](docs/AUDITORIA.md) | Auditoria de app, site e conteúdo + backlog priorizado |
| [material/](material/) | "Os primeiros dias" — guia autoral em PDF, publicado no site e linkado no app |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Visão, brand, Gotinha, navegação |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack e decisões técnicas |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | LGPD, Play Store, disclaimers |
| [docs/AI_STRATEGY.md](docs/AI_STRATEGY.md) | Uso de IA no produto |
| [DOCS_INDEX.md](DOCS_INDEX.md) | Índice completo |

---

## Papéis no app

- **Responsável** — cadastra criança, registra dados, convida cuidadores/médico
- **Cuidador** — entra com código de convite, registra e consulta
- **Médico** — visão de pacientes, métricas e relatórios (sem editar perfil da criança)

---

## Licença

Projeto privado — uso restrito aos mantenedores.

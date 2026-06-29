# 🍬 Doce Cuidado — DM1 Companion App

**Status:** Fase 1 (Conceito & Fundamentos) → Estruturação

> *"O app que segura a mão da família no cuidado da criança com diabetes."*

## 📁 Estrutura do Projeto

```
doce-cuidado/
├── README.md                      (este arquivo)
├── docs/
│   ├── PRODUCT.md                (visão geral, brand, conceito)
│   ├── ARCHITECTURE.md            (stack, decisões técnicas)
│   ├── AI_STRATEGY.md             (7 aplicações de IA)
│   ├── COMPLIANCE.md              (posicionamento regulatório, LGPD)
│   ├── features/
│   │   ├── 01-onboarding.md
│   │   ├── 02-dashboard.md
│   │   ├── 03-glucose-logging.md
│   │   ├── 04-insulin-logging.md
│   │   ├── 05-nutrition.md
│   │   ├── 06-learn-train.md
│   │   ├── 07-crisis-mode.md
│   │   ├── 08-history-diary.md
│   │   └── 09-family-profile.md
│   └── research/
│       ├── protocols-hypo-hyper.md
│       └── references.md
├── mockup/
│   └── index.html                 (interactive prototype)
├── src/
│   ├── app.json                   (Expo config — criado depois)
│   ├── package.json               (deps — criado depois)
│   ├── src/                       (React Native code — criado depois)
│   └── ...
├── .env.example                   (Supabase + OpenRouter keys template)
└── .gitignore
```

## 🚀 Próximos passos

1. **Reorganizar docs** ← você está aqui
2. **Revisar estrutura e strategy**
3. **Setup dev environment** (Expo, Node, git)
4. **Iniciar React Native + Supabase**

Quando disser "vamos começar", a gente inicializa tudo.

## 📋 Credenciais

Você fornecerá:
- Supabase project URL + anon key
- OpenRouter API key (ou usamos free tier no MVP)

Placeholder em `.env.example`.

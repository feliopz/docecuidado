<div align="center">

<img src="src/assets/gotinha-mascot.png" alt="Gotinha, o mascote do Doce Cuidado" width="160" />

# Doce Cuidado

### *No dia normal, o app conversa. No pânico, o app comanda.*

**O app-companheiro para famílias de crianças com diabetes tipo 1.**

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK-54-000020?style=flat-square&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Status](https://img.shields.io/badge/status-MVP_funcional-success?style=flat-square)

Desafio **CI-IA Saúde** · Centro de Inovação em IA para a Saúde — **UFMG**
Equipe **Synapse**

</div>

---

## 🩸 O problema

Uma criança é diagnosticada com diabetes tipo 1. Em questão de dias, a família
que nunca ouviu falar de "bolus" precisa aprender a **contar carboidratos**,
**calcular insulina**, **medir glicemia seis vezes por dia** — e reconhecer, em
segundos, se aquele suor frio é hipoglicemia.

Não existe um dia de treinamento. Existe alta hospitalar.

E quando a crise chega às 3h da manhã, o pai não precisa de um app com gráficos
bonitos. Precisa de alguém dizendo **o que fazer agora**.

---

## 💡 A resposta

O Doce Cuidado tem **dois modos de existir**.

<table>
<tr>
<td width="50%" valign="top">

### 🌤️ No dia normal, ele conversa

Registra, aprende junto, sugere receitas, monta o relatório para a consulta.
Um diário que a família alimenta sem esforço — e que vira dado clínico de verdade.

</td>
<td width="50%" valign="top">

### 🚨 No pânico, ele comanda

Tela vermelha. Passo a passo. Sem menu, sem escolha, sem texto longo.
**"Dê 15g de açúcar. Aguarde 15 minutos. Meça de novo."**
Botão de ligação para o 192 sempre à mão.

</td>
</tr>
</table>

---

## ✨ O que ele faz

| | Funcionalidade | Detalhe |
|:--:|---|---|
| 📸 | **Leitura por câmera** | Aponta para o glicosímetro e a IA lê o número. Fotografa o prato e ela estima os carboidratos. |
| 📊 | **Diário e gráficos** | Glicemia, insulina e nutrição num histórico único, com filtros e visualização de tendência. |
| 📄 | **Relatório em PDF** | Gera o documento que o endocrinologista pede — pronto para a consulta. |
| 🚨 | **Modo crise** | Protocolo guiado para hipo e hiperglicemia, com ligação direta para o 192. |
| 🍽️ | **Receitas** | Catálogo com informação nutricional e recomendação por IA conforme o perfil da criança. |
| 🎓 | **Aprender** | Lições curtas e quiz — a família aprende no ritmo dela, sem jargão médico. |
| 👨‍👩‍👧 | **Multi-criança e multi-perfil** | Responsável, cuidador e médico. Cada um vê o que precisa ver, com convite por código. |
| 🔔 | **Lembretes** | Notificações locais para não esquecer a próxima medição. |

---

## 🧠 A IA, com responsabilidade

O app **não é um dispositivo médico** e não prescreve dose — essa linha foi
desenhada desde o primeiro dia.

O que a IA faz é tirar atrito do caminho:

- **Visão computacional** para OCR de glicosímetro e estimativa de refeição
- **Texto** para orientação educativa e recomendação de receitas
- Toda saída passa por *guardrails* de conteúdo e disclaimers de compliance
- Chamadas de LLM rodam em **Edge Function**, nunca com a chave no dispositivo

---

## 🏗️ Como é feito

```
┌─────────────────────────────┐
│  App — React Native / Expo  │   Expo Router · TypeScript
│  22 rotas, store local      │   Notificações locais
└──────────────┬──────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌───────────┐    ┌──────────────────┐
│ Supabase  │    │  Edge Functions  │  Deno
│ Postgres  │    │  (proxy de LLM)  │  → OpenRouter
│ + Auth    │    │                  │     texto + visão
└───────────┘    └──────────────────┘
```

**Stack:** React Native 0.81 · Expo SDK 54 · Expo Router 6 · TypeScript ·
Supabase (PostgreSQL + Auth + Edge Functions) · OpenRouter · EAS Build

Migração local → nuvem implementada: o app funciona offline e sincroniza quando
a conta é criada.

---

## 🚀 Rodando o projeto

```bash
git clone https://github.com/feliopz/docecuidado.git
cd docecuidado/src

npm install --legacy-peer-deps
npm start
```

Crie `src/.env.local` com:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_OPENROUTER_API_KEY=
```

Banco: rode `docs/supabase-schema.sql` e depois `docs/supabase-recipes-seed.sql`
no SQL Editor do Supabase.

> **Notificações** só funcionam de forma confiável em build nativo (APK/AAB),
> não no Expo Go.

### Build Android

```bash
cd src
eas build --platform android --profile preview
```

---

## 📁 Estrutura

```
src/                    ← o app (código executável)
├── app/                rotas do Expo Router
│   ├── (tabs)/         diário, dados, receitas, aprender, relatórios, perfil
│   ├── crise.tsx       modo crise
│   ├── glicemia.tsx    registro com OCR
│   └── nutricao.tsx    registro com visão
├── components/
├── lib/                store, supabase, auth, llm, notifications
└── assets/

supabase/functions/     Edge Functions (proxy de LLM, exclusão de conta)
docs/                   schema SQL, seeds e páginas legais
website/ · landing/     site do produto
scripts/                build e release do APK
```

---

<div align="center">

**Equipe Synapse** — estudantes do IFMG
Desafio CI-IA Saúde · UFMG · 2026

</div>

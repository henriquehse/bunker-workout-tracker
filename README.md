# 🏋️ Bunker Workout Tracker

Mini site estático (HTML5/CSS3/JS puro) que exibe os treinos gerados pelo Bunker. Hospedado no Vercel, atualizado automaticamente via push do Bunker.

## Como funciona

1. Você gera um treino na seção Bio-Data do Bunker
2. Clica em **"Salvar Treino"** — o Bunker faz push do JSON para este repositório
3. O Vercel reserye automaticamente — o treino aparece no site em segundos

## Deploy no Vercel

```bash
# 1. Fork ou clone este repositório
# 2. Acesse vercel.com → New Project → Import este repo
# 3. Framework: Other (Static Site) — zero config necessária
# 4. Deploy ✅
```

## Configuração no Bunker

Adicione estas variáveis ao `.env` do Bunker:

```env
GITHUB_TOKEN=ghp_seuTokenAqui
WORKOUT_TRACKER_REPO=seuUsuario/bunker-workout-tracker
```

## Roadmap

| Versão | Status | Features |
|--------|--------|----------|
| v1.0 | ✅ Atual | Histórico, stats, streak, accordion de exercícios |
| v1.1 | 🔜 | Botão "Salvar" integrado ao Bunker frontend |
| v2.0 | 🔜 | Gráficos de evolução (Chart.js) |
| v3.0 | 🔜 | Integração com agente Telegram |

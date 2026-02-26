# Odds Intelligence Cruzadx 🎯

**Sistema de detección de arbitraje deportivo en tiempo real**

Detección automática de oportunidades de arbitraje y value betting en deportes de nicho y ligas menores, con integración de Polymarket y The Odds API.

## 🚀 Inicio Rápido

```bash
# 1. Clonar y configurar
cp .env.example .env
# Edita .env con tus API keys

# 2. Instalar dependencias y preparar DB
bun install
bun run db:push

# 3. Poblar datos de demostración
bun run seed

# 4. Iniciar la aplicación
bun run dev
```

Abre http://localhost:3000 en tu navegador.

## 📋 Requisitos Previos

### APIs Necesarias

| API | Propósito | Costo | Enlace |
|-----|-----------|-------|--------|
| **The Odds API** | Cuotas de bookmakers tradicionales | Free: 500 req/mes, Pro: $500/mes | [the-odds-api.com](https://the-odds-api.com/) |
| **Polymarket** | Mercados de predicción deportiva | Gratuito | Incluido |
| **Telegram Bot** (opcional) | Alertas en tiempo real | Gratuito | Habla con @BotFather |
| **Resend** (opcional) | Alertas por email | Free: 3,000 emails/mes | [resend.com](https://resend.com/) |

### Límites y Rate Limits

| Fuente | Rate Limit | Notas |
|--------|------------|-------|
| The Odds API | 1 req/segundo | Plan Pro: más requests |
| Polymarket | ~10 req/segundo | Sin límite oficial documentado |

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│  The Odds API   │     │   Polymarket    │
│  (Bookmakers)   │     │ (Predictions)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌─────────────────────┐
         │   Connectors Layer  │
         │  - Rate Limiting    │
         │  - Error Handling   │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Normalizer Engine  │
         │  - Entity Resolution│
         │  - Market Unification│
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Arbitrage Engine   │
         │  - 2-way & 3-way    │
         │  - Fee Adjustment   │
         │  - Quality Scoring  │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   SQLite Database   │
         │   + Prisma ORM      │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   Next.js API       │
         │   + Dashboard UI    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Alert Dispatcher   │
         │  - Telegram         │
         │  - Email            │
         │  - Webhook          │
         └─────────────────────┘
```

## 📊 Deportes Soportados

### Prioridad Alta (Nicho/Ligas Menores)

- **E-sports**: Counter-Strike 2, League of Legends, Valorant, Dota 2
- **MMA/UFC**: Preliminares, Fight Nights
- **Tenis**: ATP Challenger, ITF Futures
- **Fútbol**: Ligas secundarias (Argentina, Brasil, Chile, Colombia, Australia, etc.)

### Fuentes de Datos

| Deporte | Fuentes |
|---------|---------|
| E-sports | Polymarket, The Odds API (DraftKings, FanDuel, etc.) |
| MMA | Polymarket, The Odds API |
| Tenis Challenger | Polymarket, The Odds API |
| Fútbol Ligas Menores | The Odds API |

## 🧮 Motor de Arbitraje

### Fórmulas Implementadas

#### Arbitraje 2-way
```
Probabilidad Implícita Total = (1/odds₁) + (1/odds₂)
Margen de Arbitraje = 1 - Probabilidad Total
% Beneficio = Margen / Probabilidad Total
```

**Ejemplo:**
- NaVi @ 2.15 (Polymarket)
- FaZe @ 1.95 (DraftKings)
- Probabilidad Total = 0.465 + 0.513 = 0.978
- Margen = 1 - 0.978 = 0.022 (2.2%)
- Beneficio = 2.2%

#### Arbitraje 3-way (1X2)
```
Probabilidad Total = (1/odds₁) + (1/oddsX) + (1/odds₂)
```

### Staking Proporcional

Para un stake total de $100:
```
Stakeᵢ = $100 × (Probabilidad Implícitaᵢ / Probabilidad Total)
```

### Ajustes por Fricción

- **Comisiones**: Se ajustan las probabilidades implícitas
- **Slippage**: Estimación del 0.5% por defecto
- **Latencia**: Se clasifica en low/medium/high

### Scoring de Calidad

| Factor | Puntos Máx |
|--------|------------|
| Margen de beneficio | 40 |
| Liquidez | 25 |
| Fiabilidad bookmaker | 35 |
| Penalización latencia | -10 a -25 |

**Grados:** A (80+), B (65+), C (50+), D (35+), F (<35)

## 🔔 Sistema de Alertas

### Telegram
```bash
# 1. Crear bot con @BotFather
/newbot
# 2. Obtener Chat ID con @userinfobot
/start
# 3. Configurar en Settings
```

### Email (Resend)
```bash
# 1. Crear cuenta en resend.com
# 2. Obtener API key
# 3. Configurar en .env
```

### Webhook
```json
POST a tu URL configurada:
{
  "timestamp": "2024-01-15T10:30:00Z",
  "type": "arbitrage_opportunity",
  "data": { /* oportunidad completa */ }
}
```

## 📁 Estructura del Proyecto

```
odds-intelligence/
├── prisma/
│   └── schema.prisma      # Modelo de datos
├── src/
│   ├── app/
│   │   ├── api/           # Endpoints REST
│   │   │   ├── opportunities/
│   │   │   ├── events/
│   │   │   ├── alerts/
│   │   │   ├── settings/
│   │   │   ├── sync/
│   │   │   └── health/
│   │   └── page.tsx       # Dashboard principal
│   ├── components/
│   │   ├── dashboard/
│   │   ├── opportunities/
│   │   ├── settings/
│   │   └── alerts/
│   └── lib/
│       ├── connectors/    # APIs externas
│       │   ├── the-odds-api.ts
│       │   └── polymarket.ts
│       ├── arbitrage/     # Motor de cálculo
│       │   └── engine.ts
│       ├── alerts/        # Sistema de alertas
│       │   └── notifier.ts
│       ├── normalizer/    # Normalización de datos
│       └── db.ts          # Prisma client
├── seed.ts                # Datos de demostración
├── docker-compose.yml     # Deploy con Docker
└── .env.example           # Variables de entorno
```

## 🐳 Docker

```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## 🧪 Testing

```bash
# Tests unitarios
bun test

# Linting
bun run lint
```

## ⚖️ Cumplimiento Legal

### ✅ Lo que SÍ hace la aplicación

- Usa **solo APIs oficiales autorizadas**
- Lee datos de fuentes con licencia (The Odds API, Polymarket API pública)
- **No ejecuta apuestas automáticamente**
- Informa sobre oportunidades de arbitraje
- Cumple con ToS de los proveedores de datos

### ❌ Lo que NO hace

- No hace scraping de sitios web
- No evade límites o detección
- No ejecuta apuestas automáticamente
- No almacena datos personales de apostadores

### Aviso Legal

Esta aplicación es **solo para fines informativos y educativos**. El arbitraje deportivo:
- Puede violar los términos de servicio de algunas casas de apuestas
- Puede resultar en limitaciones de cuenta
- Requiere investigación propia antes de actuar
- No garantiza beneficios

**El usuario es responsable de verificar la legalidad en su jurisdicción.**

## 🔧 Desarrollo

### Añadir nuevo conector

```typescript
// src/lib/connectors/mi-conector.ts
export class MiConector {
  async getEvents(): Promise<NormalizedEvent[]> {
    // Implementar
  }
  
  async getOdds(): Promise<NormalizedOdds[]> {
    // Implementar
  }
}
```

### Añadir nuevo canal de alertas

```typescript
// src/lib/alerts/notifier.ts
export class MiCanalNotifier {
  async sendAlert(opportunity: OpportunityWithDetails): Promise<Result> {
    // Implementar
  }
}
```

## 📈 Métricas y Observabilidad

- Endpoint `/api/health` para health checks
- Logs de sincronización en consola
- Estado de conexiones en dashboard

## 🆘 Troubleshooting

### Error: "No opportunities found"
- Verifica que el seed se ejecutó: `bun run seed`
- Comprueba las API keys en `.env`

### Error: "Database connection failed"
- Verifica que `db:push` se ejecutó
- Comprueba permisos de archivo SQLite

### Telegram no envía alertas
- Verifica el bot token
- Confirma el Chat ID con @userinfobot
- El bot debe haber sido iniciado con `/start`

## 📄 Licencia

MIT License - Uso educativo e informativo.

---

**Odds Intelligence** - Detección de arbitraje deportivo ética y legal

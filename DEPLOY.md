# 🚀 Guía de Despliegue en Vercel

## Paso 1: Crear base de datos en Supabase (Gratis)

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **Project Settings → Database**
4. Copia la **Connection string** (URI format)
   - Tiene este formato: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

## Paso 2: Subir a GitHub

1. Crea un repositorio nuevo en GitHub
2. Descarga el proyecto del workspace como ZIP
3. Sube los archivos al repositorio

## Paso 3: Desplegar en Vercel

1. Ve a https://vercel.com y haz login
2. Clic en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Configura las **Environment Variables**:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
ODDS_API_KEY=11f3c27b516b83188665359974b04964
TELEGRAM_BOT_TOKEN=7723691246:AAGOL-uAbLcL_2_E6brbAixdwFH2mHe68uo
```

5. Clic en **Deploy**

## Paso 4: Ejecutar migraciones

Después del despliegue, ve a la terminal de Vercel o ejecuta localmente con la DATABASE_URL de producción:

```bash
npx prisma db push
npx prisma db seed
```

## Alternativa Rápida: Usar Vercel Postgres

1. En Vercel, ve a tu proyecto
2. Clic en **Storage → Create Database → Postgres**
3. Vercel te dará la `DATABASE_URL` automáticamente
4. Añádela a las Environment Variables

---

## Variables de Entorno Requeridas

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Tu conexión PostgreSQL |
| `ODDS_API_KEY` | `11f3c27b516b83188665359974b04964` |
| `TELEGRAM_BOT_TOKEN` | `7723691246:AAGOL-uAbLcL_2_E6brbAixdwFH2mHe68uo` |

---

## URLs Útiles

- **Vercel**: https://vercel.com
- **Supabase**: https://supabase.com
- **GitHub**: https://github.com

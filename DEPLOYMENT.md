# Deployment Guide (Vercel + Render)

## 1. Database (Render PostgreSQL)
- Khởi tạo PostgreSQL instance trên Render.
- Copy `Internal Database URL` và `External Database URL`.

## 2. Backend (Render Web Service)
- Môi trường: Node.js
- Build Command: `npm install && npx prisma generate`
- Start Command: `npm start`
- Environment Variables:
  - `DATABASE_URL`: [Your External Postgres URL]
  - `PORT`: 10000
  - `NODE_ENV`: production

## 3. Frontend (Vercel)
- Framework Preset: Vite / React
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: [Your Render Backend URL]

## 4. Prisma Migration (On Deploy)
Mỗi lần deploy backend có thay đổi schema, chạy:
`npx prisma migrate deploy`
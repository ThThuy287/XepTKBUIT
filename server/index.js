const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// ==========================================
// 1. BẢO MẬT & CORS (Chuẩn Production Vercel)
// ==========================================
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// ==========================================
// 2. SOCKET.IO (Khớp với CORS của Express)
// ==========================================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

// NẾU BẠN CÓ LOGIC SOCKET.IO (io.on('connection'...)), HÃY DÁN VÀO ĐÂY:
// io.on('connection', (socket) => { ... });

// ==========================================
// 3. CẤU HÌNH UPLOAD (Giới hạn 10MB)
// ==========================================
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// ==========================================
// 4. ROUTES (ĐƯỜNG DẪN API)
// ==========================================
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, server: true, database: true });
  } catch (err) {
    console.error("Health check DB error:", err.message);
    res.status(500).json({ success: false, server: true, database: false });
  }
});

const importRoutes = require('./routes/import'); 
const courseRoutes = require('./routes/courses'); 

// KHAI BÁO CHÍNH XÁC ĐỂ TRÁNH LỖI 404
app.use('/api/import', importRoutes);
app.use('/api/courses', courseRoutes);

// ==========================================
// 5. BẮT LỖI TOÀN CỤC (GLOBAL ERROR HANDLER)
// ==========================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// ==========================================
// 6. KHỞI ĐỘNG SERVER (Bind to 0.0.0.0 cho Render)
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
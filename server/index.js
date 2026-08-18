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
// 1. BẢO MẬT & CORS (Chuẩn Production)
// ==========================================
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// ==========================================
// 2. SOCKET.IO (Khớp với CORS của Express)
// ==========================================
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

// Logic Socket.IO của bạn (Ví dụ: báo tiến trình import)
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Gắn io vào app để dùng trong các controller (như importController)
app.set('io', io);

// ==========================================
// 3. CẤU HÌNH UPLOAD FILE (Giới hạn 10MB)
// ==========================================
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// ==========================================
// 4. ROUTES (ĐƯỜNG DẪN API)
// ==========================================
// Route kiểm tra sức khỏe máy chủ
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, server: true, database: true });
  } catch (err) {
    console.error("Health check DB error:", err.message);
    res.status(500).json({ success: false, server: true, database: false });
  }
});

// CHỈ GỌI DUY NHẤT MASTER ROUTER (Đã xóa bỏ import.js và courses.js)
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

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
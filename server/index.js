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
// 1. BẢO MẬT & CORS (Chấp nhận MỌI link Vercel)
// ==========================================
const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép localhost và mọi tên miền kết thúc bằng .vercel.app
    if (!origin || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ==========================================
// 2. SOCKET.IO (Khớp tuyệt đối với cấu hình Express CORS)
// ==========================================
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

// Logic Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Gắn io vào app để có thể gọi từ bên trong các Controller
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
// Route kiểm tra trạng thái máy chủ
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, server: true, database: true });
  } catch (err) {
    console.error("Health check DB error:", err.message);
    res.status(500).json({ success: false, server: true, database: false });
  }
});

// Nạp duy nhất Master Router (api.js)
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
// 6. KHỞI ĐỘNG SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
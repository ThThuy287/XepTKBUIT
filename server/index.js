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

// SECURITY & CORS: Chỉ cho phép Vercel Domain truy cập
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// 2. SOCKET.IO CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

app.use(cors(corsOptions));
app.use(express.json());
// SOCKET.IO CORS
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});
// (Giữ nguyên logic socket hiện tại của bạn ở đây...)

// BẢO MẬT: Giới hạn File Upload 10MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Max
});

// ROUTE: Health Check cho Render biết Server sống hay chết
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, server: true, database: true });
  } catch (err) {
    console.error("Health check DB error:", err.message);
    res.status(500).json({ success: false, server: true, database: false });
  }
});

// (Giữ nguyên các routes API hiện tại của bạn ở đây...)

// GLOBAL ERROR HANDLER (Chống rò rỉ Stack Trace lên Frontend)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// STARTUP SERVER (Bind to 0.0.0.0 cho Render)
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
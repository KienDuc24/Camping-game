const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: [
    "https://camping-game.vercel.app"  // ✅ Thay bằng domain frontend thật của bạn
  ],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://camping-game.vercel.app"  // ✅ Phải trùng với domain frontend
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Dữ liệu phòng
let rooms = {};

// Xử lý socket.io
io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join-room", ({ roomCode, player }) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = [];
    rooms[roomCode].push({ name: player, socketId: socket.id });
    io.to(roomCode).emit("update-players", {
      list: rooms[roomCode].map(p => p.name),
      host: rooms[roomCode][0]?.name || null
    });
  });

  socket.on("leave-room", ({ roomCode, player }) => {
    if (rooms[roomCode]) {
      rooms[roomCode] = rooms[roomCode].filter(p => p.name !== player);
      if (rooms[roomCode].length === 0) {
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit("update-players", {
          list: rooms[roomCode].map(p => p.name),
          host: rooms[roomCode][0]?.name || null
        });
      }
    }
    socket.leave(roomCode);
  });

  socket.on("start-game", ({ roomCode }) => {
    io.to(roomCode).emit("game-started");
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const index = rooms[roomCode].findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        rooms[roomCode].splice(index, 1);
        if (rooms[roomCode].length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit("update-players", {
            list: rooms[roomCode].map(p => p.name),
            host: rooms[roomCode][0]?.name || null
          });
        }
        break;
      }
    }
  });

  // 🔁 Kết nối logic riêng cho Truth or Dare (nếu có)
  try {
    require("./ToD/todSocket")(socket, io);
  } catch (e) {
    console.log("ℹ️ todSocket.js not found or error loading it (bỏ qua nếu chưa cần)");
  }
});

// API kiểm tra server sống
app.get("/", (req, res) => res.send("✅ Socket.io server is running"));

// Lắng nghe
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

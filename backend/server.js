const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Dữ liệu phòng
let rooms = {};

// Xử lý socket.io
io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  // Người chơi vào phòng
  socket.on("join-room", ({ roomCode, player }) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = [];
    rooms[roomCode].push({ name: player, socketId: socket.id });
    io.to(roomCode).emit("update-players", {
      list: rooms[roomCode].map(p => p.name),
      host: rooms[roomCode][0]?.name || null
    });
  });

  // Rời phòng
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

  // Bắt đầu game
  socket.on("start-game", ({ roomCode }) => {
    io.to(roomCode).emit("game-started");
  });

  // Ngắt kết nối
  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const index = rooms[roomCode].findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        const player = rooms[roomCode][index].name;
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

  // 🔁 Kết nối logic riêng của trò chơi Truth or Dare
  require("./ToD/todSocket")(socket, io);
});

// API kiểm tra server sống
app.get("/", (req, res) => res.send("✅ Socket.io server is running"));

// Lắng nghe
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

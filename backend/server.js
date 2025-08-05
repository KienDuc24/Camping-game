const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // hoặc thay bằng domain thật của bạn
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join-room", ({ roomCode, player }) => {
    socket.join(roomCode);

    // Tạo phòng nếu chưa có
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        host: player, // 👑 Chủ phòng là người đầu tiên
        players: []
      };
    }

    // Tránh thêm trùng tên
    const exists = rooms[roomCode].players.find(p => p.name === player);
    if (!exists) {
      rooms[roomCode].players.push({ name: player, socketId: socket.id });
    }

    // Gửi danh sách + chủ phòng cho tất cả
    io.to(roomCode).emit("update-players", {
      list: rooms[roomCode].players.map(p => p.name),
      host: rooms[roomCode].host
    });
  });

  socket.on("leave-room", ({ roomCode, player }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].players = rooms[roomCode].players.filter(p => p.name !== player);

      // Nếu chủ phòng rời → chuyển chủ cho người đầu tiên còn lại
      if (rooms[roomCode].host === player && rooms[roomCode].players.length > 0) {
        rooms[roomCode].host = rooms[roomCode].players[0].name;
      }

      // Nếu hết người → xóa phòng
      if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit("update-players", {
          list: rooms[roomCode].players.map(p => p.name),
          host: rooms[roomCode].host
        });
      }
    }

    socket.leave(roomCode);
  });

  socket.on("start-game", ({ roomCode, player }) => {
    const room = rooms[roomCode];
    if (room && room.host === player) {
      io.to(roomCode).emit("game-started");
    } else {
      socket.emit("not-authorized", "Chỉ chủ phòng mới được bắt đầu trò chơi");
    }
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const index = rooms[roomCode].players.findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        const player = rooms[roomCode].players[index].name;
        rooms[roomCode].players.splice(index, 1);

        if (rooms[roomCode].host === player && rooms[roomCode].players.length > 0) {
          rooms[roomCode].host = rooms[roomCode].players[0].name;
        }

        if (rooms[roomCode].players.length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit("update-players", {
            list: rooms[roomCode].players.map(p => p.name),
            host: rooms[roomCode].host
          });
        }

        break;
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("✅ Socket.io server running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

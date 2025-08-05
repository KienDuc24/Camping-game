const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Hoặc thay bằng domain frontend nếu muốn
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join-room", ({ roomCode, player }) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = [];
    rooms[roomCode].push({ name: player, socketId: socket.id });
    io.to(roomCode).emit("update-players", rooms[roomCode].map(p => p.name));
  });

  socket.on("leave-room", ({ roomCode, player }) => {
    if (rooms[roomCode]) {
      rooms[roomCode] = rooms[roomCode].filter(p => p.name !== player);
      if (rooms[roomCode].length === 0) delete rooms[roomCode];
      else io.to(roomCode).emit("update-players", rooms[roomCode].map(p => p.name));
    }
    socket.leave(roomCode);
  });

  socket.on("start-game", ({ roomCode }) => {
    io.to(roomCode).emit("game-started");
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const i = rooms[roomCode].findIndex(p => p.socketId === socket.id);
      if (i !== -1) {
        rooms[roomCode].splice(i, 1);
        if (rooms[roomCode].length === 0) delete rooms[roomCode];
        else io.to(roomCode).emit("update-players", rooms[roomCode].map(p => p.name));
        break;
      }
    }
  });
});

app.get("/", (req, res) => res.send("✅ Socket.io server is running"));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Thêm dòng này

server.listen(PORT, HOST, () => { // Thay đổi dòng này để bao gồm HOST
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

//ToD
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ✅ Gọi file ToD
const setupToDSocket = require("./ToD/todSocket");
setupToDSocket(io);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: ["https://camping-game.vercel.app"],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://camping-game.vercel.app"],
    methods: ["GET", "POST"],
    transports: ["websocket"],
    credentials: true
  }
});

let rooms = {};

// Require module to handle game logic after io is created
const setupToDSocket = require("./games/ToD/todSocket");

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  // Manage join/leave/start
  socket.on("join-room", ({ roomCode, player }) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) {
        rooms[roomCode] = [];
        // Initialize gameStarted flag for the room
        rooms[roomCode].gameStarted = false; 
    }
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
        // Only delete the room if it's empty AND the game hasn't started
        if (!rooms[roomCode].gameStarted) {
            delete rooms[roomCode];
            console.log(`Room ${roomCode} deleted as it's empty and game not started.`);
        } else {
            console.log(`Room ${roomCode} is empty but game started. Keeping room for now.`);
        }
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
    console.log("🚀 Received start game request:", roomCode);
    if (rooms[roomCode]) {
        // Set gameStarted flag when the game officially starts
        rooms[roomCode].gameStarted = true; 
    }
    const host = rooms[roomCode]?.[0]?.name;
    io.to(roomCode).emit("game-started", { host });
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const index = rooms[roomCode].findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        // Remove player from the room
        rooms[roomCode].splice(index, 1);

        // Only delete the room if it's empty AND the game hasn't started
        // This prevents rooms from being deleted during page navigation (e.g., to game page)
        if (rooms[roomCode].length === 0 && !rooms[roomCode].gameStarted) {
          delete rooms[roomCode];
          console.log(`Room ${roomCode} deleted due to empty and game not started.`);
        } else if (rooms[roomCode].length === 0 && rooms[roomCode].gameStarted) {
            console.log(`Room ${roomCode} is empty but game started. Keeping room.`);
        } else {
          // Room is not empty, update players and host
          io.to(roomCode).emit("update-players", {
            list: rooms[roomCode].map(p => p.name),
            host: rooms[roomCode][0]?.name || null
          });
        }
        break;
      }
    }
  });

  // Attach specific logic for Truth or Dare correctly
  setupToDSocket(socket, io, rooms);
});

// API check server
app.get("/", (req, res) => res.send("✅ Socket.io server is running"));

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

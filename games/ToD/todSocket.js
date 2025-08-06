module.exports = (socket, io, rooms) => {
  const votes = {};

  socket.on("tod-join", ({ roomCode, player }) => {
    // Ensure the room exists. If not, return and potentially inform the client.
    if (!rooms[roomCode]) {
      console.log(`Room ${roomCode} not found for tod-join. Player: ${player}`);
      io.to(socket.id).emit("tod-error", "Phòng không tồn tại hoặc đã bị đóng.");
      return;
    }

    // Find the player in the existing room list and update their socketId
    let playerFound = false;
    for (let i = 0; i < rooms[roomCode].length; i++) {
      if (rooms[roomCode][i].name === player) {
        rooms[roomCode][i].socketId = socket.id; // Update socketId for the new connection
        playerFound = true;
        break;
      }
    }

    // If player not found in the room list (should ideally not happen if room.html flow is followed),
    // add them. This might be a fallback for edge cases.
    if (!playerFound) {
        rooms[roomCode].push({ name: player, socketId: socket.id });
        console.log(`Player ${player} added to room ${roomCode} via tod-join (fallback).`);
    }

    socket.join(roomCode); // Ensure the new socket joins the room for this game

    // Emit tod-joined specifically to the joining player
    io.to(socket.id).emit("tod-joined", {
      host: rooms[roomCode][0]?.name, // Host is always the first player in the array
      players: rooms[roomCode].map(p => p.name)
    });

    // Also broadcast to all others in the room (including the joining player)
    // that the player list and host status might have updated.
    // This helps synchronize state across all clients in the game room.
    io.to(roomCode).emit("update-players", {
        list: rooms[roomCode].map(p => p.name),
        host: rooms[roomCode][0]?.name || null
    });
  });

  socket.on("tod-start-round", ({ roomCode }) => {
    const players = rooms[roomCode];
    if (!players || players.length < 2) {
      io.to(socket.id).emit("tod-error", "Cần ít nhất 2 người để chơi!");
      return;
    }

    const chosen = players[Math.floor(Math.random() * players.length)].name;
    votes[roomCode] = { total: players.length - 1, data: [], target: chosen };

    io.to(roomCode).emit("tod-your-turn", { player: chosen });
  });

  socket.on("tod-choice", ({ roomCode, player, choice }) => {
    const question = choice === "truth"
      ? "Bạn đã từng lén đọc tin nhắn người khác chưa?"
      : "Hãy nhảy một điệu nhảy ngẫu nhiên!";
    io.to(roomCode).emit("tod-question", { player, choice, question });
  });

  socket.on("tod-vote", ({ roomCode, player, vote }) => {
    if (!votes[roomCode]) return;
    const v = votes[roomCode];
    v.data.push(vote);

    io.to(roomCode).emit("tod-voted", { player, vote });

    if (v.data.length >= v.total) {
      const vCount = v.data.filter(x => x === "V").length;
      const ratio = vCount / v.total;
      const pass = ratio >= 0.7;

      io.to(roomCode).emit("tod-result", {
        result: pass,
        message: pass
          ? "👍 Trò chơi được chấp nhận! Tiếp tục!"
          : "❌ Không đủ phiếu đồng ý. Vòng kết thúc!"
      });

      delete votes[roomCode];
    }
  });
};

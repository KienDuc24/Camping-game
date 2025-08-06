module.exports = (socket, io, rooms) => {
  const votes = {};

  socket.on("tod-join", ({ roomCode, player }) => {
    if (!rooms[roomCode]) return;

    socket.join(roomCode);
    io.to(socket.id).emit("tod-joined", {
      host: rooms[roomCode][0]?.name,
      players: rooms[roomCode].map(p => p.name)
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

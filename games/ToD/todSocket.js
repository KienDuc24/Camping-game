module.exports = (socket, io, rooms) => {
  socket.on("tod-join", ({ roomCode, player }) => {
    if (!rooms[roomCode]) {
      console.log(`❌ Room ${roomCode} không tồn tại khi join`);
      return;
    }

    console.log(`🎲 ToD: ${player} đã tham gia ${roomCode}`);
    socket.join(roomCode);

    io.to(socket.id).emit("tod-joined", {
      host: rooms[roomCode][0]?.name || null,
      players: rooms[roomCode].map(p => p.name)
    });
  });

  socket.on("tod-start-round", ({ roomCode }) => {
    const players = rooms[roomCode];
    if (!players || players.length < 2) {
      console.log(`❌ Không đủ người để bắt đầu trò chơi trong phòng ${roomCode}`);
      io.to(socket.id).emit("tod-error", "Cần ít nhất 2 người để chơi!");
      return;
    }

    const randomIndex = Math.floor(Math.random() * players.length);
    const chosenPlayer = players[randomIndex].name;

    console.log(`🎯 Người bị chọn: ${chosenPlayer} trong phòng ${roomCode}`);
    io.to(roomCode).emit("tod-your-turn", { player: chosenPlayer });
  });

  socket.on("tod-choice", ({ roomCode, player, choice }) => {
    console.log(`🗨️ ${player} chọn ${choice} ở ${roomCode}`);
    const question = choice === "truth"
      ? "Bạn đã từng nói dối ai chưa?"
      : "Hãy làm 10 cái hít đất!";
    io.to(roomCode).emit("tod-question", { player, choice, question });
  });

  socket.on("tod-vote", ({ roomCode, player, vote }) => {
    console.log(`✅ ${player} vote ${vote} trong ${roomCode}`);
    io.to(roomCode).emit("tod-voted", { player, vote });

    // Optional: emit "tod-result" if vote ratio logic is implemented
    // io.to(roomCode).emit("tod-result", { message: "✅ Chấp nhận!" });
  });
};

module.exports = (socket, io, rooms) => {
  const votes = {}; // { roomCode: { [player]: "V"/"X" } }

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
      console.log(`❌ Không đủ người để chơi trong phòng ${roomCode}`);
      io.to(socket.id).emit("tod-error", "Cần ít nhất 2 người để chơi!");
      return;
    }

    const randomIndex = Math.floor(Math.random() * players.length);
    const chosenPlayer = players[randomIndex].name;

    console.log(`🎯 Người bị chọn: ${chosenPlayer} trong phòng ${roomCode}`);
    votes[roomCode] = {}; // reset lượt vote
    io.to(roomCode).emit("tod-chosen", chosenPlayer);
  });

  socket.on("tod-choice", ({ roomCode, player, choice }) => {
    console.log(`🗨️ ${player} chọn ${choice} ở ${roomCode}`);
    const question = choice === "truth"
      ? "Bạn đã từng thích ai trong nhóm chưa?"
      : "Hãy nhảy lò cò 1 vòng quanh phòng!";
    io.to(roomCode).emit("tod-question", { player, choice, question });
  });

  socket.on("tod-vote", ({ roomCode, player, vote }) => {
    console.log(`✅ ${player} vote ${vote} trong ${roomCode}`);

    // Lưu vote
    if (!votes[roomCode]) votes[roomCode] = {};
    votes[roomCode][player] = vote;

    io.to(roomCode).emit("tod-voted", { player, vote });

    // Kiểm tra nếu đủ người vote
    const numPlayers = rooms[roomCode]?.length || 0;
    const numVotes = Object.keys(votes[roomCode]).length;

    if (numVotes >= numPlayers - 1) { // Trừ người bị hỏi
      const vVotes = Object.values(votes[roomCode]).filter(v => v === "V").length;
      const ratio = vVotes / (numPlayers - 1);

      if (ratio >= 0.7) {
        io.to(roomCode).emit("tod-result", { result: true, message: "✅ Đa số đồng ý! Tiếp tục!" });
      } else {
        io.to(roomCode).emit("tod-result", { result: false, message: "❌ Bị phản đối quá nhiều!" });
      }

      votes[roomCode] = {}; // Reset cho vòng sau
    }
  });
};

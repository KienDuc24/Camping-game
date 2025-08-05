module.exports = (socket, io, rooms) => {
  socket.on("tod-join", ({ roomCode, player }) => {
    // Kiểm tra nếu room tồn tại
    if (!rooms[roomCode]) {
      console.log(`❌ Room ${roomCode} không tồn tại khi join`);
      return;
    }

    console.log(`🎲 ToD: ${player} đã tham gia ${roomCode}`);
    socket.join(roomCode);

    // Trả lại host cho FE để biết ai được quyền bắt đầu
    io.to(socket.id).emit("tod-joined", {
      host: rooms[roomCode][0]?.name || null,
      players: rooms[roomCode].map(p => p.name)
    });
  });

  socket.on("tod-start", ({ roomCode }) => {
    const players = rooms[roomCode];
    if (!players || players.length < 2) {
      console.log(`❌ Không đủ người để bắt đầu trò chơi trong phòng ${roomCode}`);
      io.to(socket.id).emit("tod-error", "Cần ít nhất 2 người để chơi!");
      return;
    }

    const randomIndex = Math.floor(Math.random() * players.length);
    const chosenPlayer = players[randomIndex].name;

    console.log(`🎯 Người bị chọn: ${chosenPlayer} trong phòng ${roomCode}`);
    io.to(roomCode).emit("tod-chosen", chosenPlayer);
  });

  socket.on("tod-choice", ({ roomCode, player, choice }) => {
    console.log(`🗨️ ${player} chọn ${choice} ở ${roomCode}`);
    // Chuyển câu hỏi giả lập - thực tế bạn có thể random từ bộ câu hỏi riêng
    const question = choice === "truth"
      ? "Bạn đã từng nói dối ai chưa?"
      : "Hãy làm 10 cái hít đất!";
    io.to(roomCode).emit("tod-question", { player, choice, question });
  });

  socket.on("tod-vote", ({ roomCode, player, vote }) => {
    console.log(`✅ ${player} vote ${vote} trong ${roomCode}`);
    // Có thể tích hợp lưu vote và check tỉ lệ
    // Đơn giản nhất, chỉ broadcast để FE test:
    io.to(roomCode).emit("tod-voted", { player, vote });
  });
};

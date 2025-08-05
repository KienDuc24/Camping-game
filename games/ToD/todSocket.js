module.exports = (socket, io, rooms) => {
  // Thu vote đang diễn ra trong mỗi room
  const votesInProgress = {};

  // Chủ phòng gửi yêu cầu bắt đầu vòng chơi
  socket.on("tod-start-round", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.length < 2) return; // cần ít nhất 2 người

    const randomPlayer = room[Math.floor(Math.random() * room.length)];
    console.log(`🎯 Người bị chọn: ${randomPlayer.name}`);

    // Reset phiếu bầu cho vòng này
    votesInProgress[roomCode] = { votes: [], total: room.length - 1 };

    // Gửi cho người được chọn
    io.to(randomPlayer.socketId).emit("tod-your-turn");

    // Gửi cho người khác để chuẩn bị vote
    room.forEach(p => {
      if (p.socketId !== randomPlayer.socketId) {
        io.to(p.socketId).emit("tod-wait-vote");
      }
    });
  });

  // Khi người được chọn chọn truth hoặc dare
  socket.on("tod-choice", ({ roomCode, choice }) => {
    const question = choice === "truth"
      ? "🤔 Câu hỏi: Bạn đã từng gian lận trong học tập chưa?"
      : "😈 Thử thách: Hát 1 câu bất kỳ!";
    io.to(roomCode).emit("tod-question", { question });
  });

  // Khi người khác vote
  socket.on("tod-vote", ({ roomCode, vote }) => {
    if (!votesInProgress[roomCode]) return;

    votesInProgress[roomCode].votes.push(vote);
    const votes = votesInProgress[roomCode].votes;
    const total = votesInProgress[roomCode].total;

    console.log(`✅ Vote nhận được: ${votes.length}/${total}`);

    // Đủ số phiếu
    if (votes.length >= total) {
      const agree = votes.filter(v => v).length;
      const rate = agree / total;
      const success = rate >= 0.7;

      console.log(`📊 Kết quả: ${agree}/${total} đồng ý (${Math.round(rate*100)}%)`);

      io.to(roomCode).emit("tod-result", { success, rate });
      delete votesInProgress[roomCode];
    }
  });
};

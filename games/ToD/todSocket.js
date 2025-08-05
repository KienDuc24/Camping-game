module.exports = (socket, io, rooms) => {
  socket.on("start-tod-round", ({ roomCode }) => {
    const players = rooms[roomCode];
    if (!players || players.length === 0) return;

    const selectedIndex = Math.floor(Math.random() * players.length);
    const selected = players[selectedIndex];

    io.to(selected.socketId).emit("tod-your-turn");

    players.forEach(p => {
      if (p.socketId !== selected.socketId) {
        io.to(p.socketId).emit("tod-wait-vote");
      }
    });

    rooms[roomCode].votes = [];
  });

  socket.on("tod-vote", ({ roomCode, vote }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (!room.votes) room.votes = [];
    room.votes.push(vote);

    if (room.votes.length >= room.length - 1) {
      const agree = room.votes.filter(v => v).length;
      const rate = agree / (room.length - 1);
      io.to(roomCode).emit("tod-result", {
        success: rate >= 0.7,
        rate
      });
    }
  });
};

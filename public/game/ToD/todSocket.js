const ToDRooms = {};

function setupToDHandlers(socket, io) {
  socket.on("join-game", ({ roomCode, player }) => {
    socket.join(roomCode);
    if (!ToDRooms[roomCode]) ToDRooms[roomCode] = { players: [], votes: [], currentTarget: null };

    const exists = ToDRooms[roomCode].players.find(p => p.name === player);
    if (!exists) {
      ToDRooms[roomCode].players.push({ name: player, socketId: socket.id });
    }
  });

  socket.on("start-round", ({ roomCode }) => {
    const room = ToDRooms[roomCode];
    if (!room) return;

    const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)].name;
    room.currentTarget = randomPlayer;
    room.votes = [];

    io.to(roomCode).emit("round-started", { target: randomPlayer });
  });

  socket.on("chosen-question", ({ roomCode, type, question }) => {
    io.to(roomCode).emit("show-question", { type, question });
  });

  socket.on("vote", ({ roomCode, player, vote }) => {
    const room = ToDRooms[roomCode];
    if (!room) return;

    if (room.votes.find(v => v.player === player)) return;
    room.votes.push({ player, vote });

    const totalPlayers = room.players.length - 1;
    const yesVotes = room.votes.filter(v => v.vote).length;

    if (room.votes.length >= totalPlayers) {
      const yesPercent = Math.round((yesVotes / totalPlayers) * 100);
      const pass = yesPercent >= 70;
      io.to(roomCode).emit("vote-result", { pass, yesPercent });
    }
  });

  socket.on("disconnect", () => {
    for (const roomCode in ToDRooms) {
      const idx = ToDRooms[roomCode].players.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        ToDRooms[roomCode].players.splice(idx, 1);
        break;
      }
    }
  });
}

module.exports = setupToDHandlers;
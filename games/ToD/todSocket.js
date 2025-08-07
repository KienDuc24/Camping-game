require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`,
  universe_domain: "googleapis.com"
};

async function getRandomQuestion(type) {
  const doc = new GoogleSpreadsheet('1V9DHRD02AZTVp-jzHcJRFsY0-sxsPg_o3IW-uSYCx3o');
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  const questions = rows.map(row => row[type === "truth" ? "A" : "B"]).filter(Boolean);
  const random = questions[Math.floor(Math.random() * questions.length)];
  return random;
}

module.exports = (socket, io, rooms) => {
  socket.on("tod-join", ({ roomCode, player }) => {
    if (!rooms[roomCode]) {
      // Nếu phòng chưa tồn tại, tạo mới và set host là người đầu tiên
      rooms[roomCode] = [{ name: player }];
      console.log(`🆕 Tạo phòng mới ${roomCode} với host ${player}`);
    } else if (!rooms[roomCode].some(p => p.name === player)) {
      // Nếu chưa có, thêm vào cuối và gán số thứ tự
      rooms[roomCode].push({ name: player, order: rooms[roomCode].length + 1 });
    }
    socket.join(roomCode);

    io.to(roomCode).emit("tod-joined", {
      host: rooms[roomCode][0]?.name || null,
      players: rooms[roomCode].map(p => ({ name: p.name, order: p.order }))
    });
  });

  // Thêm vào rooms[roomCode] một biến currentIndex
  if (!rooms[roomCode].currentIndex) rooms[roomCode].currentIndex = 0;

  // Khi host bắt đầu:
  socket.on("tod-start-round", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.length < 2) return;
    if (room.currentIndex === undefined) room.currentIndex = 0;
    const currentPlayer = room[room.currentIndex % room.length].name;
    io.to(roomCode).emit("tod-your-turn", { player: currentPlayer });
  });

  socket.on("tod-choice", async ({ roomCode, player, choice }) => {
    const question = await getRandomQuestion(choice);
    io.to(roomCode).emit("tod-question", { player, choice, question });
  });

  socket.on("tod-vote", ({ roomCode, player, vote }) => {
    console.log(`✅ ${player} vote ${vote} trong ${roomCode}`);
    io.to(roomCode).emit("tod-voted", { player, vote });

    // Optional: emit "tod-result" if vote ratio logic is implemented
    // io.to(roomCode).emit("tod-result", { message: "✅ Chấp nhận!" });
  });

  socket.on("tod-joined", ({ players, host }) => {
    document.getElementById("playerList").innerHTML = players
      .map(p => `<li>${p.order}. ${p.name}</li>`)
      .join("");
  });

  socket.on("tod-next", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.currentIndex = (room.currentIndex + 1) % room.length;
    const currentPlayer = room[room.currentIndex].name;
    io.to(roomCode).emit("tod-your-turn", { player: currentPlayer });
  });

  socket.on("tod-your-turn", ({ player }) => {
    const isYou = player === playerName;
    document.getElementById("status").textContent = isYou
      ? "👉 Đến lượt bạn! Ấn QUAY để chọn Truth hay Dare"
      : `⏳ ${player} đang quay vòng...`;

    const controls = document.getElementById("controls");
    controls.innerHTML = "";

    if (isYou) {
      const spinBtn = document.createElement("button");
      spinBtn.textContent = "🎯 Quay";
      spinBtn.className = "choice-btn";
      spinBtn.onclick = () => {
        // Hiện vòng quay (có thể dùng canvas hoặc ảnh động)
        showSpinner().then(result => {
          socket.emit("tod-choice", {
            roomCode,
            player: playerName,
            choice: result // "truth" hoặc "dare"
          });
        });
      };
      controls.appendChild(spinBtn);
    }
  });

  socket.on("tod-question", ({ player, choice, question }) => {
    document.getElementById("status").textContent =
      `${player} chọn ${choice.toUpperCase()}: ${question}`;
    document.getElementById("controls").innerHTML = "";
  });

  // Hàm showSpinner trả về Promise<"truth"|"dare">
  function showSpinner() {
    return new Promise(resolve => {
      // Hiển thị vòng quay, sau 2s random truth/dare
      const spinner = document.createElement("div");
      spinner.innerHTML = `<img src="spinner.gif" style="width:120px">`;
      document.getElementById("controls").appendChild(spinner);
      setTimeout(() => {
        spinner.remove();
        const result = Math.random() < 0.5 ? "truth" : "dare";
        resolve(result);
      }, 2000);
    });
  }
};

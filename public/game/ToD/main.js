const socket = io("https://camping-game-production.up.railway.app", {
  transports: ["websocket"],
  secure: true
});

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get("code");
const hostFromURL = urlParams.get("host");
let playerName = sessionStorage.getItem("playerName");
if (!playerName) {
  playerName = prompt("Vui lòng nhập tên của bạn:");
  if (playerName) {
    sessionStorage.setItem("playerName", playerName);
  } else {
    alert("Bạn phải nhập tên để tham gia trò chơi!");
    window.location.href = "/";
    throw new Error("Player name is required.");
  }
}

document.getElementById("roomCode").textContent = roomCode;
let currentHost = null;
let currentAsked = null; // Lưu người bị hỏi để highlight

socket.on("connect", () => {
  socket.emit("tod-join", { roomCode, player: playerName });
});

socket.on("tod-joined", ({ players, host }) => {
  currentHost = host;
  document.getElementById("playerList").innerHTML = players
    .map((p, i) => `<li>${i === 0 ? "👑 " : "👤 "}${p.name}</li>`)
    .join("");
  document.getElementById("status").textContent = `Người chơi: ${players.length}`;
  renderTable(players, currentAsked);

  // Chỉ host mới được hiện nút bắt đầu
  if (playerName === host) {
    document.getElementById("controls").innerHTML =
      `<button class="btn-green" onclick="socket.emit('tod-start-round', { roomCode })">Bắt đầu vòng chơi</button>`;
  } else {
    document.getElementById("controls").innerHTML = "";
  }
});

function renderTable(players, askedName) {
  const table = document.getElementById("table-area");
  table.querySelectorAll(".player-avatar").forEach(e => e.remove());
  const n = players.length;
  const isMobile = window.innerWidth <= 600;
  // Tăng bán kính để avatar nằm ngoài bàn
  const a = isMobile ? 110 : 260; // bán kính ngang
  const b = isMobile ? 60 : 130;  // bán kính dọc
  const centerX = isMobile ? 90 : 210;
  const centerY = isMobile ? 45 : 110;
  players.forEach((p, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const x = centerX + a * Math.cos(angle) - (isMobile ? 16 : 32);
    const y = centerY + b * Math.sin(angle) - (isMobile ? 16 : 32);
    const div = document.createElement("div");
    div.className = "player-avatar" +
      (p.name === playerName ? " you" : "") +
      (askedName && p.name === askedName ? " asked" : "");
    div.style.left = x + "px";
    div.style.top = y + "px";
    div.innerHTML = `
      ${askedName && p.name === askedName ? '<div class="question-mark">?</div>' : ''}
      <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}" width="${isMobile ? 24 : 36}" height="${isMobile ? 24 : 36}" style="border-radius:50%">
      <span>${p.name}</span>
    `;
    table.appendChild(div);
  });
}

let hasChosen = false;

socket.on("tod-your-turn", ({ player }) => {
  const isYou = player === playerName;
  document.getElementById("status").textContent =
    isYou
      ? "👉 Đến lượt bạn! Chọn Sự thật hoặc Thử thách"
      : `⏳ ${player} đang chọn Sự thật hoặc Thử thách...`;

  document.getElementById("controls").innerHTML = "";
  currentAsked = null;
  hasChosen = false;

  // Reset popup/câu hỏi khi đến lượt mới
  hideQuestionPopup();
  votePopup.classList.add("hidden");
  card.classList.add("hidden");

  if (!isYou) {
    document.getElementById("controls").innerHTML = `<div class="spinner"></div>`;
  } else {
    ["Sự thật", "Thử thách"].forEach((label, idx) => {
      const btn = document.createElement("button");
      btn.innerHTML = idx === 0
        ? '👼 Sự thật'
        : '😈 Thử thách';
      btn.className = "choice-btn " + (idx === 0 ? "truth" : "dare");
      btn.onclick = () => {
        if (hasChosen) return; // Không cho chọn lại
        hasChosen = true;
        socket.emit("tod-choice", {
          roomCode,
          player: playerName,
          choice: idx === 0 ? "truth" : "dare"
        });
        document.getElementById("controls").innerHTML = `<div class="spinner"></div>`;
      };
      document.getElementById("controls").appendChild(btn);
    });
  }
});

const card = document.getElementById("challenge-card");
const cardContent = card.querySelector(".card-content");
const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");

let startX = null;

function showCard(content) {
  cardContent.textContent = content;
  card.classList.remove("hidden", "swipe-left", "swipe-right");
}

function hideCard(direction) {
  card.classList.add(direction);
  setTimeout(() => {
    card.classList.add("hidden");
    card.classList.remove("swipe-left", "swipe-right");
  }, 400);
}

// Swipe logic
card.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});
card.addEventListener("touchend", e => {
  if (startX === null) return;
  const endX = e.changedTouches[0].clientX;
  if (endX - startX > 80) {
    acceptBtn.click();
  } else if (startX - endX > 80) {
    rejectBtn.click();
  }
  startX = null;
});

// Button logic
acceptBtn.onclick = () => {
  hideCard("swipe-right");
  socket.emit("tod-vote", { roomCode, player: playerName, vote: "accept" });
};
rejectBtn.onclick = () => {
  hideCard("swipe-left");
  socket.emit("tod-vote", { roomCode, player: playerName, vote: "reject" });
};

// Ẩn popup vote mặc định
const votePopup = document.getElementById("vote-popup");
votePopup.classList.add("hidden");

// Khi nhận thử thách mới
socket.on("tod-question", ({ player, choice, question }) => {
  currentAsked = player;
  renderTable(
    Array.from(document.querySelectorAll("#playerList li")).map(li => ({ name: li.textContent.replace(/^(\W+\s)?/, "") })),
    currentAsked
  );
  showQuestionPopup(player, choice, question);

  // Luôn hiện popup vote cho tất cả mọi người
  votePopup.classList.remove("hidden");

  // Reset trạng thái chọn
  hasChosen = false;
});

// Khi đã vote xong hoặc hết lượt thì ẩn popup vote và câu hỏi
socket.on("tod-result", ({ result }) => {
  hideQuestionPopup();
  card.classList.add("hidden");
  votePopup.classList.add("hidden");
  // Reset trạng thái chọn
  hasChosen = false;
  if (result === "accepted") {
    document.getElementById("status").textContent = "✅ Đa số chấp nhận! Đến lượt tiếp theo...";
  } else {
    document.getElementById("status").textContent = "❌ Không đủ chấp nhận, phải trả lời lại!";
  }
});

socket.on("tod-error", (msg) => {
  alert("❌ " + msg);
});

socket.on("tod-join-failed", ({ reason }) => {
  alert(reason || "Không thể vào phòng này!");
  window.location.href = "/";
});

const questionPopup = document.getElementById("question-popup");
const questionContent = document.getElementById("question-content");
const shrinkBtn = document.getElementById("shrink-btn");
const questionMini = document.getElementById("question-mini");

let currentQuestionType = ""; // "truth" hoặc "dare"

function showQuestionPopup(player, choice, question) {
  currentQuestionType = choice;
  questionContent.innerHTML = (choice === "truth"
    ? '👼 Sự thật'
    : '😈 Thử thách') + ` <b>${player}</b>: ${question}`;
  questionPopup.className = "question-popup " + choice;
  questionPopup.classList.remove("hidden");
  questionMini.className = "question-mini " + choice + " hidden";
}
function hideQuestionPopup() {
  questionPopup.classList.add("hidden");
  questionMini.classList.add("hidden");
}

// Nút thu nhỏ
shrinkBtn.onclick = () => {
  questionPopup.classList.add("hidden");
  questionMini.className = "question-mini " + currentQuestionType;
  questionMini.classList.remove("hidden");
};
// Khi bấm icon nhỏ thì phóng to lại
questionMini.onclick = () => {
  questionPopup.classList.remove("hidden");
  questionMini.classList.add("hidden");
};

socket.on("tod-voted", ({ acceptCount, voted, total }) => {
  document.getElementById("status").textContent =
    `Đã vote: ${voted}/${total} | Chấp thuận: ${acceptCount}`;
});




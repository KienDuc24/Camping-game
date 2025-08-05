let selectedGame = '';
let joinMode = '';

function openRoomPopup(game) {
  if (game === '🔞 Game 18+') {
    goToSpecialRoom();
    return;
  } else {
    selectedGame = game;
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('roomOptions').style.display = 'block';
  }
}

function goToSpecialRoom() {
  window.open('https://www.topcv.vn/viec-lam', '_blank');
}

function closePopup() {
  document.getElementById('overlay').style.display = 'none';
  document.querySelectorAll('.popup').forEach(p => p.style.display = 'none');
}

function showRoomCodeInput() {
  document.getElementById('roomOptions').style.display = 'none';
  document.getElementById('roomCodeInput').style.display = 'block';
}

function backToRoomOptions() {
  document.getElementById('roomCodeInput').style.display = 'none';
  document.getElementById('roomOptions').style.display = 'block';
  document.getElementById('nicknameInput').style.display = 'none';
  document.getElementById('roomOptions').style.display = 'block';
}

function showNicknameInput(mode) {
  joinMode = mode;
  document.getElementById('roomOptions').style.display = 'none';
  document.getElementById('nicknameInput').style.display = 'block';
}

// Tạo phòng mới
async function createRoomAndRedirect() {
  const name = document.getElementById('playerName').value.trim();
  if (!name) {
    alert("Vui lòng nhập tên hiển thị.");
    return;
  }
  try {
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: name, game: selectedGame })
    });
    const data = await res.json();
    if (data.roomCode) {
      console.log('Redirecting to room:', data.roomCode);
      window.location.href = `room.html?code=${data.roomCode}&game=${encodeURIComponent(selectedGame)}`;
    } else {
      alert('Lỗi tạo phòng!');
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Lỗi kết nối!');
  }
  closePopup();
}

// Tham gia phòng
function joinRoomAndRedirect() {
  document.getElementById('roomCodeInput').style.display = 'none';
  document.getElementById('nicknameInput').style.display = 'block';
  joinMode = 'join';
}

async function submitNickname() {
  const name = document.getElementById('playerName').value.trim();
  sessionStorage.setItem("playerName", name);
  if (!name) {
    alert("Vui lòng nhập tên hiển thị.");
    return;
  }

  try {
    if (joinMode === 'create') {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: name, game: selectedGame })
      });
      const data = await res.json();
      if (data.roomCode) {
        console.log('Redirecting to room:', data.roomCode);
        window.location.href = `room.html?code=${data.roomCode}&game=${encodeURIComponent(selectedGame)}`;
      } else {
        alert('Lỗi tạo phòng!');
      }
    } else if (joinMode === 'join') {
      const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, player: name, game: selectedGame })
      });
      const data = await res.json();
      if (data.success) {
        // So sánh game trong phòng và selectedGame
        if (data.game !== selectedGame) {
          alert(`Phòng này dành cho trò chơi "${data.game}", không khớp với trò chơi bạn đã chọn ("${selectedGame}").`);
          return;
        }
        console.log('Joining room:', roomCode);
        window.location.href = `room.html?code=${roomCode}&game=${encodeURIComponent(selectedGame)}`;
      } else {
        alert(data.message || 'Không tìm thấy phòng!');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Lỗi kết nối!');
  }
  closePopup();
}

window.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('.game-grid');
  if (!grid) return;
  const res = await fetch('games.json');
  const games = await res.json();
  grid.innerHTML = '';
  games.forEach(game => {
    grid.innerHTML += `
      <div class="game-card">
        <div class="game-icon">${game.iconPath.startsWith('/') ? `<img src="${game.iconPath}" style="width:48px;height:48px;border-radius:8px;" />` : game.iconPath}</div>
        <div class="game-name">${game.name}</div>
        <div class="game-desc">${game.desc}</div>
        <div class="players">👥 ${game.players}</div>
        <button class="play-button" onclick="openRoomPopup('${game.name}')">🚀 Vào chơi</button>
      </div>
    `;
  });
});

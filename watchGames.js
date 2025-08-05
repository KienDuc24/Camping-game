const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const gameRoot = path.join(__dirname, 'public', 'game');

console.log('👀 Watching for changes in game directory...');
console.log('📁 Watching:', gameRoot);

// Chạy generateGames.js lần đầu
exec('node generateGames.js', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running generateGames.js:', error);
    return;
  }
  console.log('✅ Initial generation completed');
});

// Theo dõi thay đổi trong thư mục game
fs.watch(gameRoot, { recursive: true }, (eventType, filename) => {
  if (filename) {
    console.log(`\n🔄 Change detected: ${eventType} - ${filename}`);
    
    // Chạy lại generateGames.js
    exec('node generateGames.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error running generateGames.js:', error);
        return;
      }
      console.log('✅ Games updated successfully');
    });
  }
});

console.log('💡 Press Ctrl+C to stop watching'); 
const fs = require('fs');
const path = require('path');

// Root path of the project
const rootPath = '/Users/shubhamchoudhary/Desktop/sahil/untitled folder/automation';
const filePath = path.join(rootPath, 'src/dolix-yt/angreziPitaraYTShortAutomatio/quizData.json');

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

try {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at: ${filePath}`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`🎲 Shuffling ${data.length} questions...`);
  
  const shuffledData = shuffle(data);
  
  fs.writeFileSync(filePath, JSON.stringify(shuffledData, null, 2));
  console.log('✅ quizData.json has been shuffled successfully!');
} catch (err) {
  console.error('❌ Error shuffling JSON:', err.message);
}

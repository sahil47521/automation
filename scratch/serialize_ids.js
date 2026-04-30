const fs = require('fs');
const path = require('path');

const rootPath = '/Users/shubhamchoudhary/Desktop/sahil/untitled folder/automation';
const filePath = path.join(rootPath, 'src/dolix-yt/angreziPitaraYTShortAutomatio/quizData.json');

try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`🔢 Re-serializing IDs for ${data.length} questions...`);
  
  const serializedData = data.map((item, index) => {
    return {
      ...item,
      id: index // Starting from 0 to match array index, or use index + 1 if you prefer
    };
  });
  
  fs.writeFileSync(filePath, JSON.stringify(serializedData, null, 2));
  console.log('✅ IDs have been re-serialized successfully (0 to ' + (data.length - 1) + ')!');
} catch (err) {
  console.error('❌ Error serializing IDs:', err.message);
}

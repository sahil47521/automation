const YouTubeAutomation = require('./app');
const fs = require('fs');

async function testShortsLocally() {
    console.log('🧪 Starting Local Shorts Test (No Upload)...');
    const automation = new YouTubeAutomation();
    
    // Generate 2 shorts for testing
    for (let i = 0; i < 2; i++) {
        const targetIndex = automation.state.lastIndex + i;
        const quiz = automation.quizData[targetIndex];
        
        if (!quiz) {
            console.error('❌ No more quizzes found!');
            break;
        }

        console.log(`\n🎬 [Test ${i+1}/2] Rendering Quiz #${targetIndex}...`);
        
        // 1. Audio
        const intros = [
            "Namaste! Kya aap is sawal ka sahi jawab de sakte hain?",
            "99% log is English quiz mein fail ho jate hain. Kya aap unme se hain?",
            "Chaliye test karte hain aapka English level. Ye raha sawal.",
            "Ye sawal kaafi tricky hai, dhyan se sochiye."
        ];
        const thinking = ["Sochiye... Sahi jawab kya hai?", "Guess kijiye... Time shuru hota hai ab."];
        const introText = intros[Math.floor(Math.random() * intros.length)];
        const thinkText = thinking[Math.floor(Math.random() * thinking.length)];

        let audioText = `${introText} \n ${quiz.question}. \n`;
        quiz.options.forEach((opt, idx) => { audioText += `Option ${String.fromCharCode(65 + idx)}. ${opt}. \n`; });
        audioText += `${thinkText} ... ... ... \n`;
        audioText += `Sahi jawab hai: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}.\n`;
        audioText += `... \n Aise hi aur videos ke liye Angrezi Pitara App download karein aur humein follow karein!`;
        
        const audioPath = await automation.tts.generate(audioText, `test_audio_${targetIndex}`);

        // 2. Render
        const videoFilename = `TEST_SHORT_${targetIndex}`;
        const videoPath = await automation.renderer.render(quiz, audioPath, videoFilename);

        console.log(`✅ [Test ${i+1}/2] Done! Video saved at: ${videoPath}`);
        
        // Note: We are NOT calling uploader.upload() here.
    }
}

testShortsLocally().catch(console.error);

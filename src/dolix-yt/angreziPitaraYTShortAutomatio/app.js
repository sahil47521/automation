const fs = require('fs');
const path = require('path');
const TTSService = require('./tts');
const VideoRenderer = require('./renderer');
const YouTubeUploader = require('./uploader');
const config = require('./config');

class YouTubeAutomation {
  constructor() {
    this.tts = new TTSService(config.automation.tempDir);
    this.renderer = new VideoRenderer();
    this.uploader = new YouTubeUploader();
    this.quizData = JSON.parse(fs.readFileSync(path.join(__dirname, 'quizData.json'), 'utf8'));
    this.stateFile = path.join(__dirname, 'state.json');
    this.state = this.loadState();
  }

  loadState() {
    if (fs.existsSync(this.stateFile)) {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    }
    return { lastIndex: -1, uploads: [] };
  }

  saveState() {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  async runSingle(index = null) {
    const targetIndex = index !== null ? index : this.state.lastIndex + 1;
    if (targetIndex >= this.quizData.length) {
      console.log('No more quizzes left!');
      return;
    }

    const quiz = this.quizData[targetIndex];
    console.log(`\n--- Starting Viral Automation for Quiz #${targetIndex} ---`);

    try {
      // 1. Audio - Includes Answer Reveal logic
      let audioText = `Namaste! Kya aap is sawal ka sahi jawab de sakte hain?\n`;
      audioText += `Sawal hai: ${quiz.question}.\n`;
      audioText += `Options hain:\n`;
      
      quiz.options.forEach((opt, i) => {
        audioText += `Option ${String.fromCharCode(65 + i)}: ${opt}.\n`;
      });
      
      audioText += `Sochiye... sahi jawab kya hai? ... ... ... ... ... \n`;
      audioText += `Sahi jawab hai: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}.\n`;
      audioText += `Agar aapka jawab sahi tha to comment mein YES likhein!\n`;
      audioText += `Daily English practice ke liye Angrezi Pitara app download karein aur Telegram channel join karein. Link niche comment aur description dono mein mil jayenge.`;
      
      const audioPath = await this.tts.generate(audioText, `audio_${targetIndex}`);

      // 2. Video Rendering
      const videoFilename = `short_${targetIndex}`;
      const videoPath = await this.renderer.render(quiz, audioPath, videoFilename);

      // 3. SEO Metadata Generation
      const tags = ['EnglishPractice', 'LearnEnglish', 'HindiToEnglish', 'Quiz', 'Shorts', 'Educational', 'AngreziPitara'];
      const title = `English Challenge: ${quiz.question.substring(0, 30)}... #Shorts #Quiz`;
      
      let description = `Can you solve this English challenge? 🤔 Improve your English daily with Angrezi Pitara!\n\n`;
      description += `Today's Question: ${quiz.question}\n\n`;
      description += `🚀 Join our Telegram for PDFs:\n${config.brand.telegram}\n\n`;
      description += `📱 Download App for Daily Quizzes:\n${config.brand.appLink}\n\n`;
      description += `#EnglishQuiz #LearnEnglish #Grammar #ShortsFeed #Educational #AngreziPitara #EnglishChallenge`;

      const metadata = { title, description, tags };

      // 4. Upload to YouTube
      console.log(`[Uploader] Uploading to YouTube...`);
      try {
        const uploadResult = await this.uploader.upload(videoPath, metadata);
        const videoId = uploadResult.id;
        console.log(`✅ [Uploader] Upload successful! Video ID: ${videoId}`);

        // 5. AUTO-COMMENT (Crucial for conversions)
        const commentText = `✅ Correct Answer: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}\n\n` +
                           `📲 Download App for Daily Quizzes:\n${config.brand.appLink}\n\n` +
                           `📢 Join Telegram for PDFs:\n${config.brand.telegram}`;
        console.log(`[Uploader] Posting pinned comment...`);
        await this.uploader.postComment(videoId, commentText);
        
        // 6. Cleanup (Set to true in .env if you want to save space)
        const shouldCleanup = process.env.CLEANUP === 'true';
        if (shouldCleanup) {
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        }
        
      } catch (uploadErr) {
        console.error(`❌ [Uploader] Task failed: ${uploadErr.message}`);
      }

      // 7. Update State
      this.state.lastIndex = targetIndex;
      this.state.uploads.push({
        index: targetIndex,
        date: new Date().toISOString(),
        title
      });
      this.saveState();

      console.log(`--- Finished Viral Automation for Quiz #${targetIndex} ---`);
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }
}

// If run directly
if (require.main === module) {
  const automation = new YouTubeAutomation();
  automation.runSingle().catch(console.error);
}

module.exports = YouTubeAutomation;

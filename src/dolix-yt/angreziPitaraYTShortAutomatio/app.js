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
    console.log(`\n--- Starting Automation for Quiz #${targetIndex} ---`);

    try {
      // 1. Audio - Conversational Hinglish style
      let audioText = `Is sentence ki sahi pehchan kare.\n`;
      audioText += `Question ye hai ki: ${quiz.question}.\n`;
      
      quiz.options.forEach((opt, i) => {
        audioText += `Option ${String.fromCharCode(65 + i)}: ${opt}.\n`;
      });
      
      audioText += `Apna jawab comment box mein likhein.\n`;
      audioText += `English practice ke liye abhi Angrezi Pitara app download kare aur daily quizzes ke liye humara Telegram channel join kare. Link in description. Dhanyawad.`;
      
      const audioPath = await this.tts.generate(audioText, `audio_${targetIndex}`);

      // 2. Video Rendering
      const videoFilename = `short_${targetIndex}`;
      const videoPath = await this.renderer.render(quiz, audioPath, videoFilename);

      // 3. SEO Metadata Generation
      const tags = ['EnglishPractice', 'LearnEnglish', 'HindiToEnglish', 'Quiz', 'Shorts', 'Educational'];
      const title = `Can you solve this? ${quiz.question.substring(0, 50)}... #EnglishLearning #Shorts`;
      
      let description = `🚀 Improve your English with this quick quiz!\n\n`;
      description += `Question: ${quiz.question}\n\n`;
      description += `✅ Solution: The correct answer is "${quiz.options[quiz.correctIndex]}".\n\n`;
      description += `📲 Download Angrezi Pitara App for more practice: ${config.brand.appLink}\n`;
      description += `📢 Join our Telegram for daily quizzes: ${config.brand.telegram}\n\n`;
      description += `#EnglishQuiz #HindiToEnglish #SpokenEnglish #AngreziPitara`;

      const metadata = { title, description, tags };

      // 4. Upload to YouTube
      console.log(`[Uploader] Uploading to YouTube...`);
      try {
        const uploadResult = await this.uploader.upload(videoPath, metadata);
        
        // 5. Cleanup (Only if upload is successful)
        console.log(`[Cleaner] Cleanup disabled for inspection...`);
        // if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        // if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        
      } catch (uploadErr) {
        console.error(`[Uploader] Upload failed: ${uploadErr.message}`);
        console.log(`[Uploader] Video kept for manual review: ${videoPath}`);
      }

      // 6. Update State
      this.state.lastIndex = targetIndex;
      this.state.uploads.push({
        index: targetIndex,
        date: new Date().toISOString(),
        title
      });
      this.saveState();

      console.log(`--- Finished Automation for Quiz #${targetIndex} ---`);
    } catch (error) {
      console.error(`Error in automation for quiz #${targetIndex}:`, error);
    }
  }
}

// If run directly
if (require.main === module) {
  const automation = new YouTubeAutomation();
  automation.runSingle().catch(console.error);
}

module.exports = YouTubeAutomation;

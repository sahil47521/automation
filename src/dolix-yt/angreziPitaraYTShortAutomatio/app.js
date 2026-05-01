const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
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
      try {
        return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      } catch (e) {
        return { lastIndex: -1 };
      }
    }
    return { lastIndex: -1 };
  }

  saveState() {
    // Only saving the lastIndex to keep it clean
    fs.writeFileSync(this.stateFile, JSON.stringify({ lastIndex: this.state.lastIndex }, null, 2));
  }

  async syncWithYouTube() {
    console.log('🔍 [Recovery] Checking YouTube for last uploaded quiz...');
    try {
      const auth = await this.uploader.getAuth();
      const youtube = google.youtube({ version: 'v3', auth });

      const response = await youtube.activities.list({
        part: 'snippet,contentDetails',
        mine: true,
        maxResults: 5
      });

      if (response.data.items && response.data.items.length > 0) {
        // Look through recent activities for the latest upload
        for (const activity of response.data.items) {
          if (activity.snippet.type === 'upload') {
            const lastTitle = activity.snippet.title;
            const match = lastTitle.match(/#(\d+)/);
            if (match) {
              const foundIndex = parseInt(match[1]);
              console.log(`✅ [Recovery] Found last index on YouTube: #${foundIndex}`);
              this.state.lastIndex = foundIndex;
              return;
            }
          }
        }
      }
      console.log('ℹ️ [Recovery] No previous uploads found with ID. Starting from scratch or local state.');
    } catch (err) {
      console.warn('⚠️ [Recovery] Could not sync with YouTube, using local state.', err.message);
    }
  }

  async runSingle(index = null) {
    // 0. Sync with YouTube first if this is the first run of this instance
    if (index === null && this.state.lastIndex === -1) {
      await this.syncWithYouTube();
    }

    const targetIndex = index !== null ? index : this.state.lastIndex + 1;
    if (targetIndex >= this.quizData.length) {
      console.log('No more quizzes left!');
      return;
    }

    const quiz = this.quizData[targetIndex];
    console.log(`\n--- Starting Viral Automation for Quiz #${targetIndex} ---`);

    try {
      // 1. Audio
      let audioText = `Namaste! Kya aap is sawal ka sahi jawab de sakte hain?\n`;
      audioText += `Sawal hai: ${quiz.question}.\n`;
      // ... (rest of audio logic stays same)
      audioText += `Sahi jawab hai: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}.\n`;
      audioText += `Daily English practice ke liye Angrezi Pitara download karein.`;

      const audioPath = await this.tts.generate(audioText, `audio_${targetIndex}`);

      // 2. Video Rendering
      const videoFilename = `short_${targetIndex}`;
      const videoPath = await this.renderer.render(quiz, audioPath, videoFilename);

      // 3. SEO Metadata (Adding #ID to title for recovery)
      const tags = ['EnglishPractice', 'LearnEnglish', 'Shorts', 'Quiz', 'AngreziPitara'];
      const title = `English Challenge #${targetIndex}: ${quiz.question.substring(0, 30)}... #Shorts`;

      let description = `Can you solve this English challenge? 🤔 Quiz #${targetIndex}\n\n`;
      description += `🚀 Telegram: ${config.brand.telegram}\n`;
      description += `📱 App: ${config.brand.appLink}`;

      const metadata = { title, description, tags };

      // 4. Upload
      console.log(`[Uploader] Uploading Quiz #${targetIndex}...`);
      const uploadResult = await this.uploader.upload(videoPath, metadata);
      const videoId = uploadResult.id;

      // 5. Auto-Comment
      const commentText = `✅ Correct Answer: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}`;
      await this.uploader.postComment(videoId, commentText);

      // 6. Update State (ONLY LAST INDEX)
      this.state.lastIndex = targetIndex;
      this.saveState();

      console.log(`✅ [Finished] Quiz #${targetIndex} uploaded successfully!`);

    } catch (error) {
      console.error(`❌ Error in Quiz #${targetIndex}:`, error);
    }
  }
}


// If run directly
if (require.main === module) {
  const automation = new YouTubeAutomation();
  automation.runSingle().catch(console.error);
}

module.exports = YouTubeAutomation;

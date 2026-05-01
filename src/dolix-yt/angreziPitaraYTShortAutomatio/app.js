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
      
      quiz.options.forEach((opt, i) => {
        audioText += `Option ${String.fromCharCode(65 + i)}: ${opt}.\n`;
      });
      
      audioText += `Sochiye... Sahi jawab kya hai? ... ... ... \n`;
      audioText += `Sahi jawab hai: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}.\n`;
      if (quiz.explanation) {
        audioText += `Kyunki, ${quiz.explanation}.\n`;
      }
      audioText += `Daily English practice ke liye Angrezi Pitara app download karein aur Telegram join karein.`;

      const audioPath = await this.tts.generate(audioText, `audio_${targetIndex}`);

      // 2. Video Rendering
      const videoFilename = `short_${targetIndex}`;
      const videoPath = await this.renderer.render(quiz, audioPath, videoFilename);

      // 3. SEO Metadata
      const tags = ['EnglishPractice', 'LearnEnglish', 'Shorts', 'Quiz', 'AngreziPitara', 'EnglishGrammar', 'DailyEnglish', 'Vocabulary'];
      const title = `Daily English Quiz #${targetIndex}: Can you solve this? 💡 #Shorts #EnglishLearning`;

      let description = `Test your English skills with this daily challenge! 🚀 Quiz #${targetIndex}\n\n`;
      description += `Improve your English grammar and vocabulary every day with Angrezi Pitara. Don't forget to like and subscribe for more quizzes!\n\n`;
      description += `👉 Join Telegram for PDFs: ${config.brand.telegram}\n`;
      description += `📲 Download App: ${config.brand.appLink}\n\n`;
      description += `#LearnEnglish #EnglishQuiz #Shorts #GrammarTips #AngreziPitara #SpokenEnglish`;

      const metadata = { title, description, tags };

      // 4. Upload
      console.log(`[Uploader] Uploading Quiz #${targetIndex}...`);
      const uploadResult = await this.uploader.upload(videoPath, metadata);
      const videoId = uploadResult.id;

      // 5. Auto-Playlist
      if (config.automation.playlists.shorts) {
          await this.uploader.addToPlaylist(videoId, config.automation.playlists.shorts);
      }

      // 6. Auto-Comment
      const commentText = `✅ Correct Answer: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}`;
      await this.uploader.postComment(videoId, commentText);

      // 6. Update State (ONLY LAST INDEX)
      this.state.lastIndex = targetIndex;
      this.saveState();

      // 7. Cleanup
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

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

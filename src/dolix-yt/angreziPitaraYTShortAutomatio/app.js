const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const TTSService = require('./tts');
const VideoRenderer = require('./renderer');
const YouTubeUploader = require('./uploader');
const config = require('./config');
const persistence = require('./persistence');

class YouTubeAutomation {
  constructor() {
    this.tts = new TTSService(config.automation.tempDir);
    this.renderer = new VideoRenderer();
    this.uploader = new YouTubeUploader();
    this.quizData = JSON.parse(fs.readFileSync(path.join(__dirname, 'quizData.json'), 'utf8'));
    this.stateFile = path.join(__dirname, 'state.json');
    this.state = { lastIndex: -1 };
    this.hasSynced = false;
  }

  async init() {
    await persistence.connect();
    const dbState = await persistence.getState('shorts_state');
    if (dbState) {
      console.log(`📡 [MongoDB] Loaded state: lastIndex = ${dbState.lastIndex}`);
      this.state = dbState;
    } else {
      // Fallback to file if DB empty
      this.state = this.loadFromFile();
    }
  }

  loadFromFile() {
    if (fs.existsSync(this.stateFile)) {
      try { return JSON.parse(fs.readFileSync(this.stateFile, 'utf8')); } catch (e) { return { lastIndex: -1 }; }
    }
    return { lastIndex: -1 };
  }

  async saveState() {
    // Save to both for safety
    fs.writeFileSync(this.stateFile, JSON.stringify({ lastIndex: this.state.lastIndex }, null, 2));
    await persistence.saveState('shorts_state', this.state);
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
    if (!this.initialized) {
      await this.init();
      this.initialized = true;
    }
    // 0. Sync with YouTube first to avoid repetition (on first run of this instance)
    if (index === null && !this.hasSynced) {
      await this.syncWithYouTube();
      this.hasSynced = true;
    }

    const targetIndex = index !== null ? index : this.state.lastIndex + 1;
    if (targetIndex >= this.quizData.length) {
      console.log('No more quizzes left!');
      return;
    }

    const quiz = this.quizData[targetIndex];
    console.log(`\n--- Starting Viral Automation for Quiz #${targetIndex} ---`);

    let audioPath, videoPath;
    try {
      // 1. Audio
      const intros = [
        "Namaste! Kya aap is sawal ka sahi jawab de sakte hain?",
        "99% log is English quiz mein fail ho jate hain. Kya aap unme se hain?",
        "Chaliye test karte hain aapka English level. Ye raha sawal.",
        "Ye sawal kaafi tricky hai, dhyan se sochiye.",
        "English seekhna hai aasaan! Guess kijiye sahi jawab."
      ];
      const thinking = ["Sochiye... Sahi jawab kya hai?", "Guess kijiye... Time shuru hota hai ab.", "Kya aapko iska jawab pata hai? Sochiye...", "Tick-tock! Guess the right answer."];
      const introText = intros[Math.floor(Math.random() * intros.length)];
      const thinkText = thinking[Math.floor(Math.random() * thinking.length)];

      let audioText = `${introText} \n`;
      audioText += `${quiz.question}. \n`;
      quiz.options.forEach((opt, i) => {
        audioText += `Option ${String.fromCharCode(65 + i)}. ${opt}. \n`;
      });
      
      audioText += `${thinkText} ... ... ... \n`;
      audioText += `Sahi jawab hai: Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}.\n`;
      if (quiz.explanation) {
        audioText += `Dhyan se suniye: ${quiz.explanation}.\n`;
      }
      audioText += `... \n Aise hi aur videos ke liye Angrezi Pitara App download karein aur humein follow karein!`;

      audioPath = await this.tts.generate(audioText, `audio_${targetIndex}`);

      // 2. Video Rendering
      const videoFilename = `short_${targetIndex}`;
      videoPath = await this.renderer.render(quiz, audioPath, videoFilename);

      // 3. SEO Metadata
      const eduKeywords = ["IELTS", "TOEFL", "SSC Exams", "Govt Job Prep", "Spoken English", "Grammar Tips", "Daily Conversation"];
      const randomKey = eduKeywords[Math.floor(Math.random() * eduKeywords.length)];
      const titleFormats = [
        `Daily English Quiz #${targetIndex}: ${quiz.question.substring(0, 30)}... #Shorts`,
        `99% FAIL! 😱 Can you solve Quiz #${targetIndex}? #EnglishLearning`,
        `#${targetIndex} English Challenge | Best for ${randomKey} #Shorts`,
        `${quiz.question.substring(0, 40)}? | English Quiz #${targetIndex}`
      ];
      const title = titleFormats[Math.floor(Math.random() * titleFormats.length)];

      let description = `Improve your ${randomKey} skills with this daily challenge! 🚀 Quiz #${targetIndex}\n\n`;
      description += `Master English grammar and vocabulary every day with Angrezi Pitara. Like and Subscribe for more!\n\n`;
      description += `👉 Join Telegram: ${config.brand.telegram}\n`;
      description += `📲 Download App: ${config.brand.appLink}\n\n`;
      description += `#LearnEnglish #EnglishQuiz #Shorts #GrammarTips #AngreziPitara #SpokenEnglish #${randomKey.replace(/ /g, '')}`;

      const tags = ['EnglishQuiz', 'Shorts', 'LearnEnglish', 'GrammarTips', 'AngreziPitara', 'EnglishSpeaking', 'Vocabulary', randomKey];
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
      await this.saveState();

      console.log(`✅ [Finished] Quiz #${targetIndex} uploaded successfully!`);

    } catch (error) {
      console.error(`❌ Error in Quiz #${targetIndex}:`, error);
    } finally {
      if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }
  }
}


// If run directly
if (require.main === module) {
  const automation = new YouTubeAutomation();
  automation.runSingle().catch(console.error);
}

module.exports = YouTubeAutomation;

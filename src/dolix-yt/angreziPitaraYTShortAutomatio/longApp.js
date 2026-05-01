const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const TTSService = require('./tts');
const LongVideoRenderer = require('./longRenderer');
const YouTubeUploader = require('./uploader');
const config = require('./config');

class LongVideoAutomation {
  constructor() {
    this.tts = new TTSService(config.automation.tempDir);
    this.renderer = new LongVideoRenderer();
    this.uploader = new YouTubeUploader();
    this.quizData = JSON.parse(fs.readFileSync(path.join(__dirname, 'quizData.json'), 'utf8'));
    this.stateFile = path.join(__dirname, 'state_long.json');
    this.state = this.loadState();
  }

  loadState() {
    if (fs.existsSync(this.stateFile)) {
      try { return JSON.parse(fs.readFileSync(this.stateFile, 'utf8')); } catch (e) { return { lastIndex: 0 }; }
    }
    return { lastIndex: 0 };
  }

  saveState() {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  async createMegaQuiz(count = 10) {
    const startIndex = this.state.lastIndex;
    const endIndex = Math.min(startIndex + count, this.quizData.length);
    const selectedQuizzes = this.quizData.slice(startIndex, endIndex);
    
    console.log(`🚀 [MegaQuiz] Creating long video for Quizzes #${startIndex} to #${endIndex-1}`);
    
    const sceneFiles = [];

    for (let i = 0; i < selectedQuizzes.length; i++) {
      const quiz = selectedQuizzes[i];
      const currentIndex = startIndex + i;
      console.log(`🎬 [MegaQuiz] Rendering Scene ${i+1}/${count} (Quiz #${currentIndex})...`);

      // 1. Generate Audio for this quiz
      let text = `Question number ${i+1}. ${quiz.question}. `;
      quiz.options.forEach((opt, idx) => { text += `Option ${String.fromCharCode(65+idx)}, ${opt}. `; });
      text += `... Think about it. ... The correct answer is Option ${String.fromCharCode(65+quiz.correctIndex)}. `;
      if (quiz.explanation) {
        text += `The reason is: ${quiz.explanation}. `;
      }
      
      const audioPath = await this.tts.generate(text, `long_audio_${currentIndex}`);
      
      // 2. Render horizontal scene
      const scenePath = await this.renderer.renderSet([quiz], audioPath, `scene_${currentIndex}`);
      sceneFiles.push(scenePath);
      
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }

    // 3. Concatenate all scenes into one big video
    const finalOutput = path.join(this.renderer.outputDir, `mega_quiz_${startIndex}_${endIndex-1}.mp4`);
    const listFilePath = path.join(this.renderer.tempDir, 'list.txt');
    const listContent = sceneFiles.map(f => `file '${path.resolve(f)}'`).join('\n');
    fs.writeFileSync(listFilePath, listContent);

    console.log(`拼接 [MegaQuiz] Stitching ${sceneFiles.length} scenes together...`);
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy -y "${finalOutput}"`;
      const { exec } = require('child_process');
      exec(cmd, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 4. Upload to YouTube
    const metadata = {
      title: `#${startIndex} Mega English Challenge: Master Grammar & Vocabulary | Angrezi Pitara`,
      description: `Welcome to our Mega English Practice Session! 🚀\n\nIn this video, we challenge you with 10 powerful English quizzes with detailed explanations to help you improve your fluency and grammar.\n\nPerfect for competitive exams and daily conversation practice.\n\n👉 Join our Telegram: ${config.brand.telegram}\n📲 Download our App: ${config.brand.appLink}\n\n#EnglishGrammar #LearnEnglish #EnglishQuiz #MegaChallenge #AngreziPitara #EnglishLearning`,
      tags: ['EnglishQuiz', 'MegaQuiz', 'LearnEnglish', 'GrammarTest', 'AngreziPitara', 'EnglishGrammar', 'EnglishSpeaking', 'Vocabulary']
    };

    console.log(`📤 [MegaQuiz] Uploading final video to YouTube...`);
    const uploadResult = await this.uploader.upload(finalOutput, metadata);
    const videoId = uploadResult.id;

    // 5. Auto-Playlist
    if (config.automation.playlists.long) {
        await this.uploader.addToPlaylist(videoId, config.automation.playlists.long);
    }

    // 6. Update State
    this.state.lastIndex = endIndex;
    this.saveState();

    // 7. Cleanup everything
    try {
      if (fs.existsSync(finalOutput)) fs.unlinkSync(finalOutput);
      if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
      sceneFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      console.log(`🧹 [MegaQuiz] Temporary files cleaned up.`);
    } catch (err) {
      console.error(`⚠️ [MegaQuiz] Cleanup error: ${err.message}`);
    }
    
    console.log(`✅ [MegaQuiz] DONE! Video created, uploaded, and storage cleared.`);
  }
}

if (require.main === module) {
  const automation = new LongVideoAutomation();
  automation.createMegaQuiz(10).catch(console.error);
}

module.exports = LongVideoAutomation;

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
    const batchNumber = Math.floor(startIndex / 10) + 1;
    console.log(`🚀 [MegaQuiz] Creating Set #${batchNumber} (Quizzes #${startIndex} to #${endIndex-1})`);
    
    const sceneFiles = [];

    // 1. Generate Intro
    console.log(`🎬 [MegaQuiz] Rendering Intro...`);
    const welcomes = [
      `Welcome to Mega English Challenge Set #${batchNumber}! Ready to test your skills? Let's begin!`,
      `Hello everyone! Today we are starting Set #${batchNumber} of our Mega Quiz series.`,
      `Are you ready for Set #${batchNumber}? Let's master English together!`,
      `Welcome back! This is Set #${batchNumber} of our Daily English Practice.`
    ];
    const introText = welcomes[Math.floor(Math.random() * welcomes.length)];
    const introAudio = await this.tts.generate(introText, `intro_audio_${startIndex}`);
    const introPath = await this.renderer.renderIntro(introText, introAudio, `intro_${startIndex}`);
    sceneFiles.push(introPath);
    if (fs.existsSync(introAudio)) fs.unlinkSync(introAudio);

    // 2. Generate Quiz Scenes
    for (let i = 0; i < count; i++) {
      const currentIndex = startIndex + i;
      const quiz = this.quizData[currentIndex];
      if (!quiz) break;

      console.log(`🎬 [MegaQuiz] Rendering Scene ${i + 1}/${count} (Quiz #${currentIndex})...`);
      
      let audioText = `Question ${i + 1}: ${quiz.question}. \n`;
      quiz.options.forEach((opt, idx) => { audioText += `Option ${String.fromCharCode(65 + idx)}. ${opt}. \n`; });
      audioText += `Think about it. ... ... ... \n`;
      audioText += `Correct Answer is Option ${String.fromCharCode(65 + quiz.correctIndex)}. ${quiz.options[quiz.correctIndex]}. \n`;
      if (quiz.explanation) audioText += `Explanation: ${quiz.explanation}. \n`;
      
      const audioPath = await this.tts.generate(audioText, `mega_audio_${currentIndex}`);
      const scenePath = await this.renderer.renderSet([quiz], audioPath, `scene_${currentIndex}`);
      sceneFiles.push(scenePath);
      
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }

    // 3. Generate Outro
    console.log(`🎬 [MegaQuiz] Rendering Outro...`);
    const outroText = `Aise hi aur videos ke liye Angrezi Pitara App download karein aur humein subscribe karein! Dhanyawaad!`;
    const outroAudio = await this.tts.generate(outroText, `outro_audio_${startIndex}`);
    const outroPath = await this.renderer.renderOutro(outroAudio, `outro_${startIndex}`);
    sceneFiles.push(outroPath);
    if (fs.existsSync(outroAudio)) fs.unlinkSync(outroAudio);

    // 4. Concatenate all scenes
    const finalOutput = path.join(this.renderer.outputDir, `mega_quiz_set_${batchNumber}.mp4`);
    const listFilePath = path.join(this.renderer.tempDir, `list_${startIndex}.txt`);
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

    // 5. Upload to YouTube
    const eduKeywords = ["SSC CGL", "IELTS", "TOEFL", "Spoken English", "English Grammar", "Bank Exams", "UPSC English"];
    const randomKey = eduKeywords[Math.floor(Math.random() * eduKeywords.length)];
    
    const titleFormats = [
      `Mega English Challenge #${batchNumber}: Master Grammar & Vocabulary | Angrezi Pitara`,
      `Set #${batchNumber}: 10/10 Score Challenge! ${randomKey} Special | Angrezi Pitara`,
      `#${batchNumber} Learn English FAST: Mega Quiz Challenge | ${randomKey} Tips`
    ];
    const title = titleFormats[Math.floor(Math.random() * titleFormats.length)];

    const metadata = {
      title: title,
      description: `Welcome to our Mega English Practice Session! 🚀\n\nIn this video (Set #${batchNumber}), we cover 10 powerful ${randomKey} quizzes with detailed explanations.\n\nMaster English grammar and vocabulary every day with Angrezi Pitara.\n\n👉 Join Telegram: ${config.brand.telegram}\n📲 Download App: ${config.brand.appLink}\n\n#EnglishGrammar #LearnEnglish #EnglishQuiz #MegaChallenge #AngreziPitara #${randomKey.replace(/ /g, '')}`,
      tags: ['EnglishQuiz', 'MegaQuiz', 'LearnEnglish', 'GrammarTest', 'AngreziPitara', 'EnglishGrammar', 'EnglishSpeaking', 'Vocabulary', randomKey]
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
      // Cleanup Scenes, List and Final Video to save server space
      [finalOutput, ...sceneFiles, listFilePath].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
      console.log(`🧹 [MegaQuiz] Temporary files and final video cleaned up.`);
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

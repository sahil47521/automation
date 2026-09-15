const fs = require('fs');
const path = require('path');
const TTSService = require('../services/tts');
const PremiumRenderer = require('./renderer');

async function testTemplate() {
  const tempDir = path.resolve(__dirname, './temp');
  const outputDir = path.resolve(__dirname, './output');
  const dataPath = path.resolve(__dirname, '../data/quizData.json');

  if (!fs.existsSync(dataPath)) {
    console.error('Quiz data file not found at:', dataPath);
    process.exit(1);
  }

  const quizData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const quiz = quizData[0]; // Take the first quiz as a test

  console.log('🧪 Starting Premium Template Rendering Test...');
  console.log('Question:', quiz.question);

  const tts = new TTSService(tempDir);
  const renderer = new PremiumRenderer(tempDir, outputDir);

  const audioChunks = {};
  
  try {
    console.log('🔊 Generating speech chunks...');
    
    // Generates speech for the intro and question
    const introText = "Can you answer this tricky English question? " + quiz.question;
    audioChunks.intro = await tts.generateSpeech(introText, 'test_intro');

    // Generates options speech
    audioChunks.options = [];
    for (let i = 0; i < quiz.options.length; i++) {
      const optText = `Option ${String.fromCharCode(65 + i)}: ${quiz.options[i]}`;
      const optPath = await tts.generateSpeech(optText, `test_opt_${i}`);
      audioChunks.options.push(optPath);
    }

    // Thinking prompt
    audioChunks.think = await tts.generateSpeech("Think about it...", 'test_think');

    // Answer
    let answerText = `The correct answer is Option ${String.fromCharCode(65 + quiz.correctIndex)}.`;
    if (quiz.explanation) {
      answerText += ` Here is why: ${quiz.explanation}`;
    }
    audioChunks.answer = await tts.generateSpeech(answerText, 'test_answer');

    // Outro
    audioChunks.outro = await tts.generateSpeech("Download our app for more daily tests!", 'test_outro');

    console.log('🎬 Rendering video...');
    const videoPath = await renderer.renderVideo(quiz, audioChunks, 'premium_test_output');
    console.log('🎉 Premium test video generated successfully at:', videoPath);

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    // Cleanup chunk audios
    console.log('🧹 Cleaning up chunk audios...');
    if (audioChunks.intro && fs.existsSync(audioChunks.intro)) fs.unlinkSync(audioChunks.intro);
    if (audioChunks.options) {
      audioChunks.options.forEach(optPath => {
        if (fs.existsSync(optPath)) fs.unlinkSync(optPath);
      });
    }
    if (audioChunks.think && fs.existsSync(audioChunks.think)) fs.unlinkSync(audioChunks.think);
    if (audioChunks.answer && fs.existsSync(audioChunks.answer)) fs.unlinkSync(audioChunks.answer);
    if (audioChunks.outro && fs.existsSync(audioChunks.outro)) fs.unlinkSync(audioChunks.outro);
    
    // Clean up directories if empty
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      if (files.length === 0) fs.rmdirSync(tempDir);
    }
  }
}

testTemplate();

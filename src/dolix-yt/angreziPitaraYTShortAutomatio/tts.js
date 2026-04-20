const path = require('path');
const fs = require('fs');
const gtts = require('node-gtts');
const { exec } = require('child_process');

class TTSService {
  constructor(tempDir) {
    this.tempDir = tempDir;
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generate(text, filename) {
    const finalMp3Path = path.join(this.tempDir, `${filename}.mp3`);
    
    // Split text into meaningful chunks for natural pauses
    // Splits by periods, question marks, and newlines
    const chunks = text.split(/[\n.?!]+/).filter(c => c.trim().length > 0);
    
    console.log(`[TTS] Generating Audio with pauses for ${chunks.length} chunks...`);

    const chunkFiles = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = path.join(this.tempDir, `${filename}_chunk_${i}.mp3`);
      await this.saveChunk(chunks[i].trim(), chunkPath);
      chunkFiles.push(chunkPath);
    }

    // Concatenate chunks with silence between them
    return await this.combineWithSilence(chunkFiles, finalMp3Path);
  }

  saveChunk(text, filePath) {
    return new Promise((resolve, reject) => {
      const tts = gtts('hi'); // Hindi handles mixed content well
      tts.save(filePath, text, (err) => {
        if (err) return reject(err);
        resolve(filePath);
      });
    });
  }

  combineWithSilence(files, outputPath) {
    return new Promise((resolve, reject) => {
      // Reduced silence for faster pacing
      const silenceFile = path.join(this.tempDir, 'silence.mp3');
      const createSilence = `ffmpeg -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.3 -q:a 9 -acodec libmp3lame -y "${silenceFile}"`;
      
      exec(createSilence, (err) => {
        if (err) return reject(err);

        // Build complex filter for concatenation with silence AND speed up and volume boost
        const filterInputs = [];
        let filterStr = "";
        
        files.forEach((f, i) => {
          filterInputs.push(`-i "${f}"`);
          filterInputs.push(`-i "${silenceFile}"`);
          filterStr += `[${i*2}:a][${i*2+1}:a]`;
        });

        const cmd = `ffmpeg ${filterInputs.join(' ')} -filter_complex "${filterStr}concat=n=${files.length * 2}:v=0:a=1,atempo=1.2,volume=1.8[a]" -map "[a]" -y "${outputPath}"`;

        exec(cmd, (concatErr) => {
          if (concatErr) return reject(concatErr);
          
          // Cleanup chunks and silence
          files.forEach(f => fs.unlinkSync(f));
          if (fs.existsSync(silenceFile)) fs.unlinkSync(silenceFile);
          
          resolve(outputPath);
        });
      });
    });
  }
}

module.exports = TTSService;

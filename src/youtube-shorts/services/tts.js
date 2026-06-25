const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');

const GOOGLE_TTS_URL = 'http://translate.google.com/translate_tts';
const MAX_CHARS = 100;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';

class TTSService {
  constructor(tempDir) {
    this.tempDir = tempDir;
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Tokenize text into chunks of MAX_CHARS for Google TTS
   */
  tokenize(text) {
    if (!text) throw new Error('No text to speak');

    const punc = '¡!()[]¿?.,;:—«»\n ';
    const parts = text.split(new RegExp(punc.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')));
    const filtered = parts.filter(p => p.length > 0);

    const output = [];
    let i = 0;
    for (const p of filtered) {
      if (!output[i]) output[i] = '';
      if (output[i].length + p.length < MAX_CHARS) {
        output[i] += ' ' + p;
      } else {
        i++;
        output[i] = p;
      }
    }
    if (output.length > 0) output[0] = output[0].substr(1);
    return output;
  }

  /**
   * Download a single TTS chunk from Google Translate (no clipboard, no spam logs)
   */
  downloadChunk(text, index, total, filePath) {
    return new Promise((resolve, reject) => {
      const encodedText = encodeURIComponent(text);
      const url = `${GOOGLE_TTS_URL}?ie=UTF-8&tl=hi&q=${encodedText}&total=${total}&idx=${index}&client=tw-ob&textlen=${text.length}`;

      const writeStream = fs.createWriteStream(filePath, { flags: index > 0 ? 'a' : 'w' });

      http.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Handle redirect
          const redirectModule = res.headers.location.startsWith('https') ? https : http;
          redirectModule.get(res.headers.location, { headers: { 'User-Agent': USER_AGENT } }, (redirectRes) => {
            redirectRes.pipe(writeStream);
            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', reject);
          }).on('error', reject);
        } else {
          res.pipe(writeStream);
          writeStream.on('finish', () => resolve(filePath));
          writeStream.on('error', reject);
        }
      }).on('error', reject);
    });
  }

  /**
   * Save full text as TTS audio (replaces node-gtts's save method)
   */
  saveChunk(text, filePath) {
    return new Promise(async (resolve, reject) => {
      try {
        const textParts = this.tokenize(text);
        const total = textParts.length;
        for (let i = 0; i < total; i++) {
          await this.downloadChunk(textParts[i], i, total, filePath);
        }
        resolve(filePath);
      } catch (err) {
        reject(err);
      }
    });
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
          filterStr += `[${i * 2}:a][${i * 2 + 1}:a]`;
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

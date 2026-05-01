const { createCanvas, loadImage } = require('canvas');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class VideoRenderer {
  constructor() {
    this.outputDir = path.resolve(config.automation.outputDir);
    this.tempDir = path.resolve(config.automation.tempDir);
    this.appIconPath = path.join(__dirname, '../../assets/images/appicons.png');
    this.bgMusicPath = path.join(__dirname, '../../assets/music/bg-music.mp3');
    
    this.width = 480; 
    this.height = 854;

    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
  }

  async getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, (err, stdout) => {
        if (err) return reject(err);
        resolve(parseFloat(stdout));
      });
    });
  }

  getLineCount(ctx, text, maxWidth) {
    const words = text.split(' ');
    let line = '';
    let count = 1;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        line = words[n] + ' ';
        count++;
      } else {
        line = testLine;
      }
    }
    return count;
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  getOptimalFontSize(ctx, text, maxWidth, initialSize) {
    let size = initialSize;
    ctx.font = `bold ${size}px Helvetica`;
    while (ctx.measureText(text).width > maxWidth * 2 && size > 24) {
      size -= 2;
      ctx.font = `bold ${size}px Helvetica`;
    }
    return size;
  }

  async render(quiz, audioPath, filename) {
    const outputPath = path.join(this.outputDir, `${filename}.mp4`);
    const { brand, design } = config;
    const duration = await this.getAudioDuration(audioPath);
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');

    let appIcon = null;
    try {
      if (fs.existsSync(this.appIconPath)) appIcon = await loadImage(this.appIconPath);
    } catch (e) {}

    // --- RANDOMIZATION SEEDS ---
    const paletteIdx = Math.floor(Math.random() * design.bgPalettes.length);
    const palette = design.bgPalettes[paletteIdx];
    const isNight = paletteIdx === 1 || paletteIdx === 8 || paletteIdx === 13 || paletteIdx === 14;
    
    const patternStyle = Math.floor(Math.random() * 4);
    const toySet = ['🧸', '🚀', '🎈', '🎨', '🍭', '🍦', '🚲', '⚽', '🎸', '🦄', '🍓', '🚗'];
    const randomToys = [
      { emoji: toySet[Math.floor(Math.random()*toySet.length)], x: 80, y: 280 },
      { emoji: toySet[Math.floor(Math.random()*toySet.length)], x: 410, y: 520 },
      { emoji: toySet[Math.floor(Math.random()*toySet.length)], x: 60, y: 780 }
    ];

    const drawStar = (ctx, x, y, radius, points = 5, inset = 0.5) => {
      ctx.save(); ctx.beginPath(); ctx.translate(x, y); ctx.moveTo(0, 0 - radius);
      for (let i = 0; i < points; i++) {
        ctx.rotate(Math.PI / points); ctx.lineTo(0, 0 - (radius * inset));
        ctx.rotate(Math.PI / points); ctx.lineTo(0, 0 - radius);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    };

    const drawBase = (progress = 0) => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, palette[1]);
      skyGrad.addColorStop(1, palette[0]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      if (patternStyle === 0) {
        for(let i=0; i<15; i++) for(let j=0; j<25; j++) { ctx.beginPath(); ctx.arc(i*40, j*40, 2.5, 0, Math.PI*2); ctx.fill(); }
      } else if (patternStyle === 1) {
        for(let i=-20; i<40; i++) { ctx.beginPath(); ctx.moveTo(i*30, 0); ctx.lineTo(i*30 + 300, this.height); ctx.stroke(); }
      } else if (patternStyle === 2) {
        for(let i=0; i<8; i++) { 
            ctx.beginPath(); 
            ctx.arc(Math.sin(i)*this.width, Math.cos(i)*this.height, 40 + Math.random()*40, 0, Math.PI*2); 
            ctx.fill(); 
        }
      } else {
        ctx.beginPath();
        for(let i=0; i<this.width; i+=40) { ctx.moveTo(i, 0); ctx.lineTo(i, this.height); }
        for(let j=0; j<this.height; j+=40) { ctx.moveTo(0, j); ctx.lineTo(this.width, j); }
        ctx.stroke();
      }

      ctx.textAlign = 'center';
      if (isNight) {
        ctx.fillStyle = '#FFFFFF';
        for(let i=0; i<20; i++) { 
            drawStar(ctx, Math.random()*this.width, Math.random()*this.height, 2 + Math.random()*4); 
        }
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const drawCloud = (x, y) => {
          ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.arc(x+15, y-10, 20, 0, Math.PI*2); ctx.arc(x+30, y, 20, 0, Math.PI*2); ctx.fill();
        };
        drawCloud(60, 230); drawCloud(380, 380);
      }

      // Abstract decorations instead of Toys
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#FFFFFF';
      for(let i=0; i<5; i++) {
        ctx.beginPath(); 
        ctx.arc(Math.random()*this.width, Math.random()*this.height, 10 + Math.random()*30, 0, Math.PI*2); 
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      if (appIcon) {
        const logoSize = 32;
        const gap = 10;
        ctx.font = 'bold 22px Helvetica';
        const textWidth = ctx.measureText(brand.name).width;
        const totalWidth = logoSize + gap + textWidth;
        const startX = (this.width - totalWidth) / 2;
        ctx.drawImage(appIcon, startX, 40, logoSize, logoSize);
        ctx.fillStyle = isNight ? '#FFFFFF' : '#0369A1';
        ctx.textAlign = 'left';
        ctx.fillText(brand.name, startX + logoSize + gap, 65);
      }

      if (progress > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.roundRect ? ctx.roundRect(60, this.height - 40, this.width - 120, 8, 4) : ctx.fillRect(60, this.height - 40, this.width - 120, 8);
        ctx.fill();
        ctx.fillStyle = isNight ? '#A5B4FC' : '#0EA5E9';
        ctx.roundRect ? ctx.roundRect(60, this.height - 40, (this.width - 120) * progress, 8, 4) : ctx.fillRect(60, this.height - 40, (this.width - 120) * progress, 8);
        ctx.fill();
      }
    };

    const qW = this.width - 80;
    const qFontSize = this.getOptimalFontSize(ctx, quiz.question, qW - 40, 36);
    const qLines = this.getLineCount(ctx, quiz.question, qW - 40);
    const cardH = Math.max(100, qLines * (qFontSize + 12) + 50);
    const cardY = 110; 

    const optW = this.width - 80;
    const optHeights = quiz.options.map(opt => {
        const fontSize = this.getOptimalFontSize(ctx, opt, optW - 120, 24);
        const lines = this.getLineCount(ctx, opt, optW - 120);
        return Math.max(65, lines * (fontSize + 8) + 25);
    });

    const drawCheck = (ctx, x, y, size) => {
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - size/2, y);
      ctx.lineTo(x - size/6, y + size/3);
      ctx.lineTo(x + size/2, y - size/3);
      ctx.stroke();
      ctx.restore();
    };

    const drawQuestion = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = palette[1];
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
      if (ctx.roundRect) {
          ctx.beginPath(); ctx.roundRect(40, cardY, qW, cardH, 20); ctx.fill(); ctx.stroke();
      } else {
          ctx.fillRect(40, cardY, qW, cardH);
      }
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#0F172A';
      ctx.font = `bold ${qFontSize}px Helvetica`;
      ctx.textAlign = 'center';
      this.wrapText(ctx, quiz.question, this.width / 2, cardY + (cardH/2) - ((qLines-1)*(qFontSize+12)/2) + 8, qW - 40, qFontSize + 12);
    };

    const drawOptions = (highlightIndex = -1, timerText = '') => {
      drawBase(highlightIndex === -1 ? 0.4 : 1);
      drawQuestion();
      let currentY = cardY + cardH + 25;
      quiz.options.forEach((opt, i) => {
        const isCorrect = i === highlightIndex;
        const boxH = optHeights[i];
        ctx.fillStyle = isCorrect ? '#10B981' : '#FFFFFF';
        ctx.strokeStyle = isCorrect ? '#059669' : palette[1];
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
        if (ctx.roundRect) {
            ctx.beginPath(); ctx.roundRect(40, currentY, optW, boxH, 16); ctx.fill(); ctx.stroke();
        } else {
            ctx.fillRect(40, currentY, optW, boxH);
        }
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.fillStyle = isCorrect ? '#059669' : '#F1F5F9';
        ctx.beginPath(); ctx.arc(75, currentY + (boxH/2), 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isCorrect ? '#FFFFFF' : '#64748B';
        ctx.font = 'bold 20px Helvetica';
        ctx.textAlign = 'center';
        ctx.fillText(String.fromCharCode(65 + i), 75, currentY + (boxH/2) + 7);
        ctx.textAlign = 'left';
        ctx.fillStyle = isCorrect ? '#FFFFFF' : '#334155';
        const fontSize = this.getOptimalFontSize(ctx, opt, optW - 120, 24);
        ctx.font = `bold ${fontSize}px Helvetica`;
        const lines = this.getLineCount(ctx, opt, optW - 120);
        this.wrapText(ctx, opt, 120, currentY + (boxH/2) - ((lines-1)*(fontSize+8)/2) + 7, optW - 140, fontSize + 8);
        if (isCorrect) {
          drawCheck(ctx, 40 + optW - 35, currentY + (boxH/2), 15);
        }
        currentY += boxH + 12;
      });

      // Timer Overlay
      if (timerText) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.arc(this.width/2, currentY + 60, 45, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Helvetica';
        ctx.textAlign = 'center';
        ctx.fillText(timerText, this.width/2, currentY + 78);
      }
    };

    const drawBrandingFrame = () => {
      drawBase(0);
      const cardW = this.width - 60, cardH = 480, cardY = 150;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 30;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(30, cardY, cardW, cardH, 30); ctx.fill(); }
      ctx.shadowBlur = 0;
      if (appIcon) {
        const logoSize = 140;
        ctx.drawImage(appIcon, this.width / 2 - logoSize / 2, cardY + 40, logoSize, logoSize);
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 36px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText(brand.name, this.width / 2, cardY + 220);
      ctx.font = '18px Helvetica';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Learn English Daily with Fun!', this.width / 2, cardY + 250);
      const drawButton = (y, text, color) => {
        ctx.fillStyle = color;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(this.width / 2 - 140, y, 280, 55, 27.5); ctx.fill(); }
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Helvetica';
        ctx.fillText(text, this.width / 2, y + 35);
      };
      drawButton(cardY + 300, 'PLAY STORE', '#0EA5E9');
      drawButton(cardY + 375, 'TELEGRAM', '#22C55E');
      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px Helvetica';
      ctx.fillText('Links in Pinned Comment', this.width / 2, cardY + 455);
    };

    // Generate Frames (Added Timer Frames)
    const f1Path = path.join(this.tempDir, `f1_${filename}.png`);
    drawBase(0.1); drawQuestion();
    fs.writeFileSync(f1Path, canvas.toBuffer('image/png'));
    
    const f2Path = path.join(this.tempDir, `f2_${filename}.png`);
    drawOptions(-1);
    fs.writeFileSync(f2Path, canvas.toBuffer('image/png'));
    
    const f2T3Path = path.join(this.tempDir, `f2t3_${filename}.png`);
    drawOptions(-1, '3');
    fs.writeFileSync(f2T3Path, canvas.toBuffer('image/png'));

    const f2T2Path = path.join(this.tempDir, `f2t2_${filename}.png`);
    drawOptions(-1, '2');
    fs.writeFileSync(f2T2Path, canvas.toBuffer('image/png'));

    const f2T1Path = path.join(this.tempDir, `f2t1_${filename}.png`);
    drawOptions(-1, '1');
    fs.writeFileSync(f2T1Path, canvas.toBuffer('image/png'));

    const f3Path = path.join(this.tempDir, `f3_${filename}.png`);
    drawOptions(quiz.correctIndex);
    fs.writeFileSync(f3Path, canvas.toBuffer('image/png'));

    const f4Path = path.join(this.tempDir, `f4_${filename}.png`);
    drawBrandingFrame();
    fs.writeFileSync(f4Path, canvas.toBuffer('image/png'));

    return new Promise((resolve, reject) => {
      const f1Dur = 2.0, f3Dur = 6, f4Dur = 4, tDur = 0.8; 
      const baseOptionsDur = Math.max(0.3, duration - f1Dur - f3Dur - f4Dur - (tDur * 3));
      const complexFilter = [
        `[0:v]trim=duration=${f1Dur},setpts=PTS-STARTPTS[v1]`,
        `[1:v]trim=duration=${baseOptionsDur},setpts=PTS-STARTPTS[v2]`,
        `[2:v]trim=duration=${tDur},setpts=PTS-STARTPTS[v2t3]`,
        `[3:v]trim=duration=${tDur},setpts=PTS-STARTPTS[v2t2]`,
        `[4:v]trim=duration=${tDur},setpts=PTS-STARTPTS[v2t1]`,
        `[5:v]trim=duration=${f3Dur},setpts=PTS-STARTPTS[v3]`,
        `[6:v]trim=duration=${f4Dur + 1},setpts=PTS-STARTPTS[v4]`,
        `[v1][v2][v2t3][v2t2][v2t1][v3][v4]concat=n=7:v=1:a=0[v]`,
        `[8:a]volume=0.06,aloop=loop=-1:size=2e9[bg]`,
        `[7:a]volume=2.0[voice]`,
        `[voice][bg]amix=inputs=2:duration=shortest[a]`
      ].join(';');
      const cmd = [
        'ffmpeg',
        `-loop 1 -i "${f1Path}"`, `-loop 1 -i "${f2Path}"`, 
        `-loop 1 -i "${f2T3Path}"`, `-loop 1 -i "${f2T2Path}"`, `-loop 1 -i "${f2T1Path}"`,
        `-loop 1 -i "${f3Path}"`, `-loop 1 -i "${f4Path}"`,
        `-i "${audioPath}"`, `-i "${this.bgMusicPath}"`,
        `-filter_complex "${complexFilter}"`, '-map "[v]" -map "[a]"',
        '-c:v libx264 -preset ultrafast -pix_fmt yuv420p',
        '-c:a aac -b:a 128k -shortest', '-y', `"${outputPath}"`
      ].join(' ');
      exec(cmd, (err) => {
        if (err) return reject(new Error(`FFmpeg failed: ${err.message}`));
        [f1Path, f2Path, f2T3Path, f2T2Path, f2T1Path, f3Path, f4Path].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
        resolve(outputPath);
      });
    });
  }
}

module.exports = VideoRenderer;

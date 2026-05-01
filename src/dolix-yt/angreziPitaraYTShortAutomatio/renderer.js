const { createCanvas, loadImage } = require('canvas');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class VideoRenderer {
  constructor() {
    this.outputDir = path.resolve(config.automation.outputDir);
    this.tempDir = path.resolve(config.automation.tempDir);
    this.appIconPath = path.resolve(__dirname, '../../assets/images/appicons.png');
    this.bgMusicPath = path.resolve(__dirname, '../../assets/music/bg-music.mp3');
    
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
    ctx.font = `bold ${size}px sans-serif`;
    while (ctx.measureText(text).width > maxWidth * 2 && size > 24) {
      size -= 2;
      ctx.font = `bold ${size}px sans-serif`;
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

    const paletteIdx = Math.floor(Math.random() * design.bgPalettes.length);
    const palette = design.bgPalettes[paletteIdx];
    const isNight = paletteIdx === 1 || paletteIdx === 8 || paletteIdx === 13 || paletteIdx === 14;

    const drawStar = (ctx, x, y, radius, points = 5, inset = 0.5) => {
      ctx.save(); ctx.beginPath(); ctx.translate(x, y); ctx.moveTo(0, 0 - radius);
      for (let i = 0; i < points; i++) {
        ctx.rotate(Math.PI / points); ctx.lineTo(0, 0 - (radius * inset));
        ctx.rotate(Math.PI / points); ctx.lineTo(0, 0 - radius);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    };

    const drawCircles = (opacity) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * opacity})`;
      for (let i = 0; i < 15; i++) {
        ctx.beginPath(); ctx.arc(Math.random() * this.width, Math.random() * this.height, 10 + Math.random() * 40, 0, Math.PI * 2); ctx.fill();
      }
    };

    const drawClouds = (opacity) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * opacity})`;
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * this.width, y = Math.random() * this.height;
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.arc(x + 15, y - 10, 20, 0, Math.PI * 2); ctx.arc(x + 30, y, 20, 0, Math.PI * 2); ctx.fill();
      }
    };

    const drawGrid = (opacity) => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * opacity})`;
      ctx.lineWidth = 1; ctx.beginPath();
      for(let i=0; i<this.width; i+=50) { ctx.moveTo(i, 0); ctx.lineTo(i, this.height); }
      for(let j=0; j<this.height; j+=50) { ctx.moveTo(0, j); ctx.lineTo(this.width, j); }
      ctx.stroke();
    };

    const drawHearts = (opacity) => {
      ctx.fillStyle = `rgba(255, 182, 193, ${0.4 * opacity})`;
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * this.width, y = Math.random() * this.height, size = 15 + Math.random() * 20;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x, y-size, x-size, y-size, x-size, y); ctx.bezierCurveTo(x-size, y+size, x, y+size, x, y+size*1.5); ctx.bezierCurveTo(x, y+size, x+size, y+size, x+size, y); ctx.bezierCurveTo(x+size, y-size, x, y-size, x, y); ctx.fill();
      }
    };

    const drawDoodles = (opacity) => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * opacity})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const x = Math.random() * this.width, y = Math.random() * this.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for(let j=0; j<3; j++) ctx.lineTo(x + Math.random()*40 - 20, y + Math.random()*40 - 20);
        ctx.stroke();
      }
    };

    const drawBase = (opacity = 1) => {
      ctx.clearRect(0, 0, this.width, this.height);
      
      // 1. Dynamic Radial/Linear Gradient
      const angle = Math.floor(Math.random() * 360) * (Math.PI / 180);
      let grad;
      if (Math.random() > 0.5) {
        grad = ctx.createRadialGradient(this.width/2, this.height/2, 50, this.width/2, this.height/2, this.height);
      } else {
        grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * this.width, Math.sin(angle) * this.height);
      }
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // 2. Randomized Organic Patterns
      const patternType = Math.floor(Math.random() * 6);
      if (patternType === 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * opacity})`;
        for (let i = 0; i < 30; i++) drawStar(ctx, Math.random() * this.width, Math.random() * this.height, 3);
      } else if (patternType === 1) {
        drawCircles(opacity);
      } else if (patternType === 2) {
        drawClouds(opacity);
      } else if (patternType === 3) {
        drawHearts(opacity);
      } else if (patternType === 4) {
        drawDoodles(opacity);
      } else {
        drawGrid(opacity);
      }

      // 3. Vignette Effect (Kinaron par halka andhera)
      const vnt = ctx.createRadialGradient(this.width/2, this.height/2, this.width/2, this.width/2, this.height/2, this.height);
      vnt.addColorStop(0, 'rgba(0,0,0,0)');
      vnt.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = vnt;
      ctx.fillRect(0, 0, this.width, this.height);

      if (appIcon) {
        ctx.save();
        const logoSize = 32;
        const gap = 10;
        ctx.font = 'bold 22px sans-serif';
        const textWidth = ctx.measureText(brand.name).width;
        const totalWidth = logoSize + gap + textWidth;
        const startX = (this.width - totalWidth) / 2;
        ctx.globalAlpha = 1.0; 
        ctx.drawImage(appIcon, startX, 40, logoSize, logoSize);
        ctx.fillStyle = isNight ? '#FFFFFF' : '#0369A1';
        ctx.textAlign = 'left';
        ctx.fillText(brand.name, startX + logoSize + gap, 65);
        ctx.restore();
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
      ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - size/2, y); ctx.lineTo(x - size/6, y + size/3); ctx.lineTo(x + size/2, y - size/3); ctx.stroke(); ctx.restore();
    };

    const drawQuestion = () => {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = palette[1]; ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(40, cardY, qW, cardH, 20); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(40, cardY, qW, cardH); }
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.fillStyle = '#0F172A'; ctx.font = `bold ${qFontSize}px sans-serif`; ctx.textAlign = 'center';
      this.wrapText(ctx, quiz.question, this.width / 2, cardY + (cardH/2) - ((qLines-1)*(qFontSize+12)/2) + 8, qW - 40, qFontSize + 12);
    };

    const drawOptions = (highlightIndex = -1, timerText = '') => {
      drawBase(highlightIndex === -1 ? 0.7 : 1);
      drawQuestion();
      let currentY = cardY + cardH + 25;
      quiz.options.forEach((opt, i) => {
        const isCorrect = i === highlightIndex;
        const boxH = optHeights[i];
        ctx.fillStyle = isCorrect ? '#10B981' : '#FFFFFF';
        ctx.strokeStyle = isCorrect ? '#059669' : palette[1];
        ctx.lineWidth = 2;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(40, currentY, optW, boxH, 16); ctx.fill(); ctx.stroke(); }
        else { ctx.fillRect(40, currentY, optW, boxH); }
        ctx.fillStyle = isCorrect ? '#059669' : '#F1F5F9'; ctx.beginPath(); ctx.arc(75, currentY + (boxH/2), 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isCorrect ? '#FFFFFF' : '#64748B'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String.fromCharCode(65 + i), 75, currentY + (boxH/2) + 7);
        ctx.textAlign = 'left'; ctx.fillStyle = isCorrect ? '#FFFFFF' : '#334155';
        const fontSize = this.getOptimalFontSize(ctx, opt, optW - 120, 24); ctx.font = `bold ${fontSize}px sans-serif`;
        const lines = this.getLineCount(ctx, opt, optW - 120);
        this.wrapText(ctx, opt, 120, currentY + (boxH/2) - ((lines-1)*(fontSize+8)/2) + 7, optW - 140, fontSize + 8);
        if (isCorrect) drawCheck(ctx, 40 + optW - 35, currentY + (boxH/2), 15);
        currentY += boxH + 12;
      });

      if (highlightIndex !== -1 && quiz.explanation) {
        const expY = currentY + 10; ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; ctx.strokeStyle = '#0EA5E9';
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(40, expY, optW, 110, 15); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#0369A1'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('💡 Tip:', 55, expY + 30);
        ctx.fillStyle = '#1E293B'; ctx.font = 'italic 18px sans-serif';
        this.wrapText(ctx, quiz.explanation, 55, expY + 60, optW - 30, 24);
      }

      if (timerText) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(this.width/2, currentY + 60, 45, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(timerText, this.width/2, currentY + 78);
      }
    };

    const drawBrandingFrame = () => {
      drawBase(0.8);
      const cardW = this.width - 60, cardH = 480, cardY = 150;
      ctx.fillStyle = '#FFFFFF';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(30, cardY, cardW, cardH, 30); ctx.fill(); }
      if (appIcon) {
        const logoSize = 140; ctx.drawImage(appIcon, this.width / 2 - logoSize / 2, cardY + 40, logoSize, logoSize);
      }
      ctx.fillStyle = '#0F172A'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(brand.name, this.width / 2, cardY + 220);
      ctx.font = '18px sans-serif'; ctx.fillStyle = '#64748B'; ctx.fillText('Learn English Daily with Fun!', this.width / 2, cardY + 250);
      const drawButton = (y, text, color) => {
        ctx.fillStyle = color; if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(this.width / 2 - 140, y, 280, 55, 27.5); ctx.fill(); }
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(text, this.width / 2, y + 35);
      };
      drawButton(cardY + 300, 'PLAY STORE', '#0EA5E9'); drawButton(cardY + 375, 'TELEGRAM', '#22C55E');
    };

    const f1Path = path.join(this.tempDir, `f1_${filename}.png`);
    drawBase(0.8); drawQuestion();
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
      const f1Dur = 2.0, f4Dur = 4, tDur = 0.8; 
      // f3 (Highlight + Explanation) should be shorter to start later
      const f3Dur = 5.5; 
      const baseOptionsDur = Math.max(0.5, duration - f1Dur - f3Dur - f4Dur - (tDur * 3));
      
      const speed = (0.97 + Math.random() * 0.06).toFixed(2);
      const visualFilter = `[0:v]trim=duration=${f1Dur},setpts=PTS-STARTPTS[v1];[1:v]trim=duration=${baseOptionsDur},setpts=PTS-STARTPTS[v2];[2:v]trim=duration=${tDur},setpts=PTS-STARTPTS[v2t3];[3:v]trim=duration=${tDur},setpts=PTS-STARTPTS[v2t2];[4:v]trim=duration=${tDur},setpts=PTS-STARTPTS[v2t1];[5:v]trim=duration=${f3Dur},setpts=PTS-STARTPTS[v3];[6:v]trim=duration=${f4Dur+1},setpts=PTS-STARTPTS[v4];[v1][v2][v2t3][v2t2][v2t1][v3][v4]concat=n=7:v=1:a=0,zoompan=z='min(zoom+0.0005,1.1)':d=1:s=${this.width}x${this.height}[v]`;
      const audioFilter = `[7:a]atempo=${speed},volume=2.2[voice];[8:a]volume=0.06,aloop=loop=-1:size=2e9[bg];[voice][bg]amix=inputs=2:duration=shortest[a]`;
      
      const cmd = `ffmpeg -loop 1 -i "${f1Path}" -loop 1 -i "${f2Path}" -loop 1 -i "${f2T3Path}" -loop 1 -i "${f2T2Path}" -loop 1 -i "${f2T1Path}" -loop 1 -i "${f3Path}" -loop 1 -i "${f4Path}" -i "${audioPath}" -i "${this.bgMusicPath}" -filter_complex "${visualFilter};${audioFilter}" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -y "${outputPath}"`;
      
      exec(cmd, (err) => {
        if (err) return reject(new Error(`FFmpeg failed: ${err.message}`));
        [f1Path, f2Path, f2T3Path, f2T2Path, f2T1Path, f3Path, f4Path].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
        resolve(outputPath);
      });
    });
  }
}

module.exports = VideoRenderer;

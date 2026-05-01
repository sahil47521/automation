const { createCanvas, loadImage } = require('canvas');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class LongVideoRenderer {
  constructor() {
    this.outputDir = path.resolve(config.automation.outputDir, '../long-videos');
    this.tempDir = path.resolve(config.automation.tempDir, '../long-temp');
    this.appIconPath = path.resolve(__dirname, '../../assets/images/appicons.png');
    this.bgMusicPath = path.resolve(__dirname, '../../assets/music/bg-music.mp3');
    
    this.width = 1280; 
    this.height = 720;

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

  drawStar(ctx, x, y, radius, points = 5, inset = 0.5) {
    ctx.save(); ctx.beginPath(); ctx.translate(x, y); ctx.moveTo(0, 0 - radius);
    for (let i = 0; i < points; i++) {
      ctx.rotate(Math.PI / points); ctx.lineTo(0, 0 - (radius * inset));
      ctx.rotate(Math.PI / points); ctx.lineTo(0, 0 - radius);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  drawCheck(ctx, x, y, size) {
    ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - size/2, y); ctx.lineTo(x - size/6, y + size/3); ctx.lineTo(x + size/2, y - size/3);
    ctx.stroke(); ctx.restore();
  }

  async loadAppIcon() {
    try {
      return await loadImage(this.appIconPath);
    } catch (e) {
      console.warn(`⚠️ [Renderer] Could not load app icon: ${e.message}`);
      return null;
    }
  }

  getOptimalFontSize(ctx, text, maxWidth, initialSize) {
    let size = initialSize;
    ctx.font = `bold ${size}px sans-serif`;
    while (ctx.measureText(text).width > maxWidth * 2 && size > 18) {
      size--;
      ctx.font = `bold ${size}px sans-serif`;
    }
    return size;
  }

  getLineCount(ctx, text, maxWidth) {
    const words = text.split(' ');
    let lines = 1;
    let line = '';
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        line = words[n] + ' ';
        lines++;
      } else {
        line = testLine;
      }
    }
    return lines;
  }

  async renderSet(quizzes, audioPath, filename) {
    const outputPath = path.join(this.outputDir, `${filename}.mp4`);
    const { brand, design } = config;
    const duration = await this.getAudioDuration(audioPath);
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');
    const palette = design.bgPalettes[Math.floor(Math.random() * design.bgPalettes.length)];
    const quiz = quizzes[0];

    let appIcon = null;
    try { if (fs.existsSync(this.appIconPath)) appIcon = await loadImage(this.appIconPath); } catch (e) {}

    const drawLayout = (highlightIdx = -1) => {
      ctx.clearRect(0, 0, this.width, this.height);
      
      // 1. Premium Background with Glassy Overlay
      const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      const patternType = Math.floor(Math.random() * 3);
      if (patternType === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for(let i=0; i<40; i++) this.drawStar(ctx, Math.random()*this.width, Math.random()*this.height, 2 + Math.random()*3);
      } else if (patternType === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<20; i++) {
          ctx.beginPath();
          ctx.arc(Math.random()*this.width, Math.random()*this.height, 20 + Math.random()*60, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for(let i=0; i<this.width; i+=50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.height); ctx.stroke(); }
        for(let j=0; j<this.height; j+=50) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(this.width, j); ctx.stroke(); }
      }

      // 2. Header Branding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, this.width, 80);
      if (appIcon) ctx.drawImage(appIcon, 40, 20, 40, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(brand.name.toUpperCase(), appIcon ? 95 : 40, 52);
      
      ctx.textAlign = 'right';
      ctx.font = '20px sans-serif';
      ctx.fillText('DAILY ENGLISH CHALLENGE', this.width - 40, 52);

      // 3. Main Split Content
      const qX = 40, qY = 110, qW = 580, qH = 460;
      
      // Question Card (Left)
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 40; ctx.shadowColor = 'rgba(0,0,0,0.25)';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(qX, qY, qW, qH, 30); ctx.fill(); }
      ctx.shadowBlur = 0;

      // Question Text
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      this.wrapText(ctx, quiz.question, qX + qW/2, qY + qH/2 - 40, qW - 80, 60);

      // Options (Right)
      const oX = 660, oY = 110, oW = 580;
      let currentOY = oY;
      quiz.options.forEach((opt, i) => {
        const isCorrect = i === highlightIdx;
        const fontSize = this.getOptimalFontSize(ctx, opt, oW - 120, 28);
        ctx.font = `bold ${fontSize}px sans-serif`;
        const lines = this.getLineCount(ctx, opt, oW - 120);
        const boxH = Math.max(95, lines * (fontSize + 10) + 30);

        // Option Container
        ctx.fillStyle = isCorrect ? '#10B981' : 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = isCorrect ? '#059669' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(oX, currentOY, oW, boxH, 20); ctx.fill(); ctx.stroke(); }

        // Letter Circle
        ctx.fillStyle = isCorrect ? '#059669' : '#F1F5F9';
        ctx.beginPath(); ctx.arc(oX + 45, currentOY + boxH/2, 28, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = isCorrect ? '#FFFFFF' : '#64748B';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String.fromCharCode(65+i), oX + 45, currentOY + boxH/2 + 9);

        // Option Text
        ctx.fillStyle = isCorrect ? '#FFFFFF' : '#1E293B';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'left';
        this.wrapText(ctx, opt, oX + 100, currentOY + boxH/2 - ((lines-1)*(fontSize+10)/2) + 9, oW - 160, fontSize + 10);
        
        if (isCorrect) this.drawCheck(ctx, oX + oW - 60, currentOY + boxH/2, 20);
        currentOY += boxH + 15;
      });

      // 4. Explanation Pop-up (Only on Highlight)
      if (highlightIdx !== -1 && quiz.explanation) {
        const expY = 590, expH = 100;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(40, expY, this.width - 80, expH, 20); ctx.fill(); ctx.stroke(); }
        
        ctx.fillStyle = '#38BDF8'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('💡 WHY? ', 70, expY + 40);
        
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'italic 24px sans-serif';
        ctx.fillText(quiz.explanation, 70, expY + 75);
      } else {
        // Bottom Footer (Always visible when no explanation)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 640, this.width, 80);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('📲 Download Angrezi Pitara App for Daily Practice! 🚀', this.width/2, 688);
      }
    };

    // Render Scenes
    drawLayout(-1);
    const normalFrame = path.join(this.tempDir, `long_normal_${filename}.png`);
    fs.writeFileSync(normalFrame, canvas.toBuffer('image/png'));

    drawLayout(quiz.correctIndex);
    const highlightFrame = path.join(this.tempDir, `long_highlight_${filename}.png`);
    fs.writeFileSync(highlightFrame, canvas.toBuffer('image/png'));

    return new Promise((resolve, reject) => {
      // Highlight starts at the very end (last 6 seconds for long videos)
      const highlightDur = 6.5; 
      const normalDur = Math.max(0.5, duration - highlightDur);
      
      const speed = (0.97 + Math.random() * 0.06).toFixed(2);
      const filter = `[0:v]trim=duration=${normalDur},setpts=PTS-STARTPTS[v1];[1:v]trim=duration=${highlightDur},setpts=PTS-STARTPTS[v2];[v1][v2]concat=n=2:v=1:a=0[v];[2:a]atempo=${speed},volume=2.2[voice];[3:a]volume=0.06,aloop=loop=-1:size=2e9[bg];[voice][bg]amix=inputs=2:duration=shortest[a]`;
      
      const cmd = `ffmpeg -loop 1 -i "${normalFrame}" -loop 1 -i "${highlightFrame}" -i "${audioPath}" -i "${this.bgMusicPath}" -filter_complex "${filter}" -map "[v]" -map "[a]" -c:v libx264 -t ${duration} -pix_fmt yuv420p -y "${outputPath}"`;
      
      exec(cmd, (err) => {
        if (err) return reject(err);
        if (fs.existsSync(normalFrame)) fs.unlinkSync(normalFrame);
        if (fs.existsSync(highlightFrame)) fs.unlinkSync(highlightFrame);
        resolve(outputPath);
      });
    });
  }

  async renderIntro(text, audioPath, filename) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');
    const { brand } = config;
    const appIcon = await this.loadAppIcon();

    const palettes = [
      ['#0369A1', '#075985'], ['#1E1B4B', '#312E81'], ['#064E3B', '#065F46'],
      ['#4C1D95', '#5B21B6'], ['#7C2D12', '#9A3412'], ['#111827', '#1F2937']
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    
    const drawBase = () => {
      const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
      grad.addColorStop(0, palette[0]); grad.addColorStop(1, palette[1]);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      const pattern = Math.floor(Math.random() * 3);
      if (pattern === 0) { for(let i=0; i<40; i++) { ctx.beginPath(); ctx.arc(Math.random()*this.width, Math.random()*this.height, 2, 0, Math.PI*2); ctx.fill(); } }
      else if (pattern === 1) { for(let i=0; i<10; i++) { ctx.fillRect(Math.random()*this.width, Math.random()*this.height, 100, 1); } }
      const vnt = ctx.createRadialGradient(this.width/2, this.height/2, 200, this.width/2, this.height/2, 800);
      vnt.addColorStop(0, 'rgba(0,0,0,0)'); vnt.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = vnt; ctx.fillRect(0, 0, this.width, this.height);
    };
    
    drawBase();
    if (appIcon) ctx.drawImage(appIcon, this.width/2 - 60, 150, 120, 120);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('MEGA ENGLISH CHALLENGE', this.width/2, 350);
    ctx.font = 'bold 32px sans-serif'; ctx.fillStyle = '#BAE6FD';
    this.wrapText(ctx, text, this.width/2, 420, 800, 45);

    const introImgPath = path.join(this.tempDir, `${filename}.png`);
    fs.writeFileSync(introImgPath, canvas.toBuffer('image/png'));
    
    const outputPath = path.join(this.tempDir, `${filename}.mp4`);
    await new Promise((resolve, reject) => {
      // Use audio duration for intro video length
      const cmd = `ffmpeg -loop 1 -i "${introImgPath}" -i "${audioPath}" -shortest -vf "zoompan=z='min(zoom+0.0005,1.1)':d=125:s=${this.width}x${this.height}" -c:v libx264 -c:a aac -pix_fmt yuv420p -y "${outputPath}"`;
      exec(cmd, (err) => {
        if (err) return reject(err);
        if (fs.existsSync(introImgPath)) fs.unlinkSync(introImgPath); // Delete PNG
        resolve();
      });
    });
    return outputPath;
  }

  async renderOutro(audioPath, filename) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');
    const { brand } = config;
    const appIcon = await this.loadAppIcon();

    const palettes = [['#0F172A', '#1E293B'], ['#111827', '#374151']];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, palette[0]); grad.addColorStop(1, palette[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, this.width, this.height);

    if (appIcon) ctx.drawImage(appIcon, this.width/2 - 80, 100, 160, 160);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(brand.name, this.width/2, 320);
    ctx.font = '22px sans-serif'; ctx.fillStyle = '#94A3B8';
    ctx.fillText('Master English Every Day with Fun Quizzes!', this.width/2, 365);

    const drawBtn = (x, y, txt, col) => {
      ctx.fillStyle = col; if(ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, 240, 55, 27.5); ctx.fill(); }
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px sans-serif'; ctx.fillText(txt, x + 120, y + 35);
    };
    drawBtn(this.width/2 - 260, 440, 'PLAY STORE', '#0EA5E9');
    drawBtn(this.width/2 + 20, 440, 'TELEGRAM', '#22C55E');

    const outroImgPath = path.join(this.tempDir, `${filename}.png`);
    fs.writeFileSync(outroImgPath, canvas.toBuffer('image/png'));
    
    const outputPath = path.join(this.tempDir, `${filename}.mp4`);
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -loop 1 -i "${outroImgPath}" -i "${audioPath}" -shortest -vf "zoompan=z='min(zoom+0.0005,1.1)':d=125:s=${this.width}x${this.height}" -c:v libx264 -c:a aac -pix_fmt yuv420p -y "${outputPath}"`;
      exec(cmd, (err) => {
        if (err) return reject(err);
        if (fs.existsSync(outroImgPath)) fs.unlinkSync(outroImgPath); // Delete PNG
        resolve();
      });
    });
    return outputPath;
  }
}

module.exports = LongVideoRenderer;

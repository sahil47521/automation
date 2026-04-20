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
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  async render(quiz, audioPath, filename) {
    const outputPath = path.join(this.outputDir, `${filename}.mp4`);
    const { colors, darkSoftBGColors } = config.design;
    const { brand } = config;

    // Pick a random background color
    const bgColor = darkSoftBGColors[Math.floor(Math.random() * darkSoftBGColors.length)];

    // Get real audio duration
    const duration = await this.getAudioDuration(audioPath);
    console.log(`[Renderer] Audio duration: ${duration}s. Using BG Color: ${bgColor}. Rendering video...`);

    const width = 720; // High Quality for YouTube Shorts
    const height = 1280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load App Icon
    let appIcon = null;
    try {
      if (fs.existsSync(this.appIconPath)) {
        appIcon = await loadImage(this.appIconPath);
      }
    } catch (e) {
      console.warn('[Renderer] Could not load app icon, skipping.');
    }

    const drawBase = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Header Branding (Top)
      if (appIcon) {
        const headerIconSize = 60;
        const headerX = 50;
        ctx.drawImage(appIcon, headerX, 40, headerIconSize, headerIconSize);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.font = 'bold 30px Helvetica';
        ctx.fillText('Angrezi Pitara', headerX + 75, 85);
      }

      // App Icon and Play Store Text (Centered Footer)
      if (appIcon) {
        const iconSize = 100;
        const totalFooterWidth = 450;
        const startX = (width - totalFooterWidth) / 2;
        
        ctx.drawImage(appIcon, startX, height - 180, iconSize, iconSize);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.font = 'bold 26px Helvetica';
        ctx.fillText('Available on Play Store', startX + 115, height - 135);
        ctx.font = '22px Helvetica';
        ctx.fillText('Learn English : Angrezi Pitara', startX + 115, height - 105);
      }

      // Footer Telegram (Centered at the very bottom)
      ctx.fillStyle = colors.secondary;
      ctx.font = '24px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText(brand.telegram, width / 2, height - 50);
    };

    const drawQuestion = () => {
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 50px Helvetica';
      ctx.textAlign = 'center';
      this.wrapText(ctx, quiz.question, width / 2, 300, width - 120, 75);
    };

    const drawOptions = () => {
      drawBase();
      drawQuestion();
      ctx.textAlign = 'left';
      const startY = 550; 
      quiz.options.forEach((opt, i) => {
        const y = startY + (i * 105);
        // Bullet
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 42px Helvetica';
        ctx.fillText(`${String.fromCharCode(65 + i)}.`, 80, y);
        // Option Text
        ctx.fillStyle = colors.text;
        ctx.font = '42px Helvetica';
        ctx.fillText(opt, 150, y);
      });
    };

    const drawBrandingFrame = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      if (appIcon) {
        const logoSize = 250;
        ctx.drawImage(appIcon, width / 2 - logoSize / 2, height / 2 - logoSize - 50, logoSize, logoSize);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 40px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText(brand.name, width / 2, height / 2 + 50);
      ctx.font = '28px Helvetica';
      ctx.fillStyle = colors.secondary;
      ctx.fillText('Available on Play Store', width / 2, height / 2 + 100);
      ctx.font = 'bold 30px Helvetica';
      ctx.fillStyle = colors.accent;
      ctx.fillText(brand.telegram, width / 2, height / 2 + 180);
    };

    // Frame 1: Question
    drawBase();
    drawQuestion();
    const frame1Path = path.join(this.tempDir, `frame1_${filename}.png`);
    fs.writeFileSync(frame1Path, canvas.toBuffer('image/png'));

    // Frame 2: Question + Options
    drawOptions();
    const frame2Path = path.join(this.tempDir, `frame2_${filename}.png`);
    fs.writeFileSync(frame2Path, canvas.toBuffer('image/png'));
    
    // Frame 3: Final Branding Focus
    drawBrandingFrame();
    const frame3Path = path.join(this.tempDir, `frame3_${filename}.png`);
    fs.writeFileSync(frame3Path, canvas.toBuffer('image/png'));

    return new Promise((resolve, reject) => {
      const f1Dur = 3;
      const f3Dur = 10;
      const f2Dur = Math.max(1, duration - f1Dur - f3Dur);

      const complexFilter = [
        `[0:v]trim=duration=${f1Dur},setpts=PTS-STARTPTS[v1]`,
        `[1:v]trim=duration=${f2Dur},setpts=PTS-STARTPTS[v2]`,
        `[2:v]trim=duration=${f3Dur + 2},setpts=PTS-STARTPTS[v3]`,
        `[v1][v2][v3]concat=n=3:v=1:a=0[v]`,
        `[4:a]volume=0.04,aloop=loop=-1:size=2e9[bg]`,
        `[3:a][bg]amix=inputs=2:duration=shortest[a]`
      ].join(';');

      const cmd = [
        'ffmpeg',
        `-loop 1 -i "${frame1Path}"`,
        `-loop 1 -i "${frame2Path}"`,
        `-loop 1 -i "${frame3Path}"`,
        `-i "${audioPath}"`,
        `-i "${this.bgMusicPath}"`,
        `-filter_complex "${complexFilter}"`,
        '-map "[v]" -map "[a]"',
        '-c:v libx264 -preset ultrafast -pix_fmt yuv420p',
        '-c:a aac -b:a 128k -shortest',
        '-y',
        `"${outputPath}"`
      ].join(' ');

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error('[Renderer] FFmpeg Error:', stderr);
          return reject(new Error(`FFmpeg failed: ${err.message}`));
        }
        [frame1Path, frame2Path, frame3Path].forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
        
        console.log(`[Renderer] Video saved to ${outputPath}`);
        resolve(outputPath);
      });
    });
  }
}

module.exports = VideoRenderer;

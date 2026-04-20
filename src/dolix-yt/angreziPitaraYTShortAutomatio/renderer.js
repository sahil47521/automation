const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
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
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
      exec(cmd, (err, stdout) => {
        if (err) return reject(err);
        resolve(parseFloat(stdout.trim()));
      });
    });
  }

  async render(quizItem, audioPath, filename) {
    const outputPath = path.join(this.outputDir, `${filename}.mp4`);
    const { colors, darkSoftBGColors } = config.design;
    const { brand } = config;

    // Pick a random background color
    const bgColor = darkSoftBGColors[Math.floor(Math.random() * darkSoftBGColors.length)];

    // Get real audio duration
    const duration = await this.getAudioDuration(audioPath);
    console.log(`[Renderer] Audio duration: ${duration}s. Using BG Color: ${bgColor}. Rendering video...`);

    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load App Icon
    let appIcon = null;
    try {
      appIcon = await loadImage(this.appIconPath);
    } catch (e) {
      console.warn('[Renderer] Could not load app icon, skipping.');
    }

    const drawBase = () => {
      // Background Solid Color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Add subtle overlay gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(0,0,0,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Header
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 60px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText(brand.name, width / 2, 150);

      // App Icon and Play Store Text
      if (appIcon) {
        const iconSize = 120;
        ctx.drawImage(appIcon, width / 2 - iconSize - 200, height - 450, iconSize, iconSize);
      }
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px Helvetica';
      ctx.textAlign = 'left';
      ctx.fillText('Available on Play Store', width / 2 - 180, height - 395);
      ctx.font = '25px Helvetica';
      ctx.fillText('Learn English : Angrezi Pitara', width / 2 - 180, height - 355);

      // Footer Telegram
      ctx.fillStyle = colors.secondary;
      ctx.font = '35px Helvetica';
      ctx.textAlign = 'right';
      ctx.fillText(brand.telegram, width - 80, height - 300);
    };

    const drawQuestion = () => {
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 70px Helvetica';
      ctx.textAlign = 'center';
      this.wrapText(ctx, quizItem.question, width / 2, 450, width - 150, 90);
    };

    const drawOptions = () => {
      ctx.fillStyle = colors.secondary;
      ctx.font = '60px Helvetica';
      ctx.textAlign = 'left';
      quizItem.options.forEach((opt, i) => {
        const text = `${String.fromCharCode(65 + i)}. ${opt}`;
        ctx.fillText(text, 150, 850 + (i * 120));
      });
    };

    const drawCTA = () => {
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 80px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText(`COMMENT YOUR ANSWER`, width / 2, 1200);
    };

    const drawBrandingFrame = () => {
      // Clear for a clean focus
      drawBase();
      
      if (appIcon) {
        const iconSize = 400;
        ctx.drawImage(appIcon, (width - iconSize) / 2, 400, iconSize, iconSize);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText('Angrezi Pitara', width / 2, 950);
      
      ctx.font = '45px Helvetica';
      ctx.fillText('Available on Play Store', width / 2, 1050);
      
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 50px Helvetica';
      ctx.fillText(brand.telegram, width / 2, 1200);
    };

    // Frame 1: Question
    drawBase();
    drawQuestion();
    const frame1Path = path.join(this.tempDir, `frame1_${filename}.png`);
    fs.writeFileSync(frame1Path, canvas.toBuffer('image/png'));

    // Frame 2: Question + Options (Will be used for Quiz + CTA audio parts)
    drawOptions();
    const frame2Path = path.join(this.tempDir, `frame2_${filename}.png`);
    fs.writeFileSync(frame2Path, canvas.toBuffer('image/png'));
    
    // Frame 3: Final Branding Focus
    drawBrandingFrame();
    const frame3Path = path.join(this.tempDir, `frame3_${filename}.png`);
    fs.writeFileSync(frame3Path, canvas.toBuffer('image/png'));

    return new Promise((resolve, reject) => {
      // Timing:
      // f1 (Intro): 3s
      // f3 (Branding): Final 10s
      // f2 (Options + CTA): Everything else
      const f1Dur = 3;
      const f3Dur = 10;
      const f2Dur = Math.max(1, duration - f1Dur - f3Dur);

      const complexFilter = [
        `[0:v]trim=duration=${f1Dur},setpts=PTS-STARTPTS[v1]`,
        `[1:v]trim=duration=${f2Dur},setpts=PTS-STARTPTS[v2]`,
        `[2:v]trim=duration=${f3Dur + 2},setpts=PTS-STARTPTS[v3]`,
        `[v1][v2][v3]concat=n=3:v=1:a=0[v]`,
        // Mix Audio: Voice (map 3) + Music (map 4)
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
        // Cleanup frames
        [frame1Path, frame2Path, frame3Path].forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
        
        console.log(`[Renderer] Video saved to ${outputPath}`);
        resolve(outputPath);
      });
    });
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
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
}

module.exports = VideoRenderer;

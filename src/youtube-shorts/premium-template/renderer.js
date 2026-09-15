const { createCanvas, loadImage } = require("canvas");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

class PremiumRenderer {
  constructor(tempDir, outputDir) {
    this.tempDir = path.resolve(tempDir);
    this.outputDir = path.resolve(outputDir);
    this.width = 480;
    this.height = 854;

    // Default assets
    this.appIconPath = path.resolve(
      __dirname,
      "../../assets/images/appicons.png",
    );
    this.bgMusicPath = path.resolve(
      __dirname,
      "../../assets/music/bg-music.mp3",
    );

    if (!fs.existsSync(this.tempDir))
      fs.mkdirSync(this.tempDir, { recursive: true });
    if (!fs.existsSync(this.outputDir))
      fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      exec(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
        (err, stdout) => {
          if (err) return reject(err);
          resolve(parseFloat(stdout));
        },
      );
    });
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  getLineCount(ctx, text, maxWidth) {
    const words = text.split(" ");
    let line = "";
    let count = 1;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        line = words[n] + " ";
        count++;
      } else {
        line = testLine;
      }
    }
    return count;
  }

  getOptimalFontSize(ctx, text, maxWidth, initialSize) {
    let size = initialSize;
    ctx.font = `bold ${size}px sans-serif`;
    while (ctx.measureText(text).width > maxWidth * 2 && size > 20) {
      size -= 2;
      ctx.font = `bold ${size}px sans-serif`;
    }
    return size;
  }

  // Draw background gradient with moving particles/bokeh
  drawBackground(ctx, timeSeed, palette) {
    // 1. Vibrant base gradient
    const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(1, palette[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Animated/dynamic particles based on timeSeed
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    const particlePositions = [
      { x: 0.15, y: 0.25, r: 40 },
      { x: 0.8, y: 0.15, r: 60 },
      { x: 0.7, y: 0.55, r: 50 },
      { x: 0.2, y: 0.75, r: 70 },
      { x: 0.5, y: 0.9, r: 35 },
    ];
    particlePositions.forEach((p, idx) => {
      const offset = Math.sin(timeSeed * 0.5 + idx) * 20;
      ctx.beginPath();
      ctx.arc(
        p.x * this.width,
        p.y * this.height + offset,
        p.r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
  }

  // Frosted Glass Effect Rounded Card
  drawGlassCard(ctx, x, y, w, h, radius, borderGlowColor = null) {
    ctx.save();

    // Setup shadow/glow
    if (borderGlowColor) {
      ctx.shadowColor = borderGlowColor;
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
    }

    // Fill semi-transparent white (glass base)
    ctx.fillStyle = "rgba(255, 255, 255, 0.13)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();

    // Border stroke (frosted edge)
    ctx.shadowBlur = 0; // Disable shadow for stroke
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = borderGlowColor || "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = borderGlowColor ? 3.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();

    ctx.restore();
  }

  // Draw category badge (e.g. Grammar Challenge)
  drawBadge(ctx, text, y) {
    ctx.save();
    ctx.font = "bold 15px sans-serif";
    const textW = ctx.measureText(text).width;
    const badgeW = textW + 30;
    const badgeH = 32;
    const badgeX = (this.width - badgeW) / 2;

    // Glass pill container
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, y, badgeW, badgeH, 16);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(text, this.width / 2, y + 21);
    ctx.restore();
  }

  // Render a single frame to a buffer
  renderFrame(
    quiz,
    activeOptionIdx,
    isCorrectRevealed,
    timerProgress,
    timeSeed,
    logoImage,
    palette,
  ) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext("2d");

    // 1. Background
    this.drawBackground(ctx, timeSeed, palette);

    // 2. Logo / Brand Name
    if (logoImage) {
      const logoSize = 28;
      ctx.drawImage(logoImage, 35, 35, logoSize, logoSize);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Angrezi Pitara", 72, 55);
    }

    // 3. Category Badge
    this.drawBadge(ctx, "🏆 GRAMMAR CHALLENGE", 35);

    // 4. Question Card (Frosted Glass)
    const qW = this.width - 70;
    const qFontSize = this.getOptimalFontSize(ctx, quiz.question, qW - 40, 30);
    const qLines = this.getLineCount(ctx, quiz.question, qW - 40);
    const cardH = Math.max(90, qLines * (qFontSize + 10) + 40);
    const cardY = 100;
    this.drawGlassCard(ctx, 35, cardY, qW, cardH, 20);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${qFontSize}px sans-serif`;
    ctx.textAlign = "center";
    this.wrapText(
      ctx,
      quiz.question,
      this.width / 2,
      cardY + cardH / 2 - ((qLines - 1) * (qFontSize + 10)) / 2 + 6,
      qW - 40,
      qFontSize + 10,
    );

    // 5. Options Cards
    let currentY = cardY + cardH + 25;
    const optW = this.width - 70;

    quiz.options.forEach((opt, i) => {
      const fontSize = this.getOptimalFontSize(ctx, opt, optW - 100, 20);
      const lines = this.getLineCount(ctx, opt, optW - 100);
      const boxH = Math.max(60, lines * (fontSize + 6) + 22);

      let borderGlow = null;
      let optionBg = "rgba(255, 255, 255, 0.13)";

      if (isCorrectRevealed) {
        if (i === quiz.correctIndex) {
          borderGlow = "#10B981"; // Green Glow
          optionBg = "rgba(16, 185, 129, 0.2)";
        } else {
          optionBg = "rgba(255, 255, 255, 0.05)"; // Fade out wrong answers
        }
      } else if (activeOptionIdx === i) {
        borderGlow = "#38BDF8"; // Sky Blue Glow for active reading option
        optionBg = "rgba(56, 189, 248, 0.2)";
      }

      ctx.save();
      // Draw card
      this.drawGlassCard(ctx, 35, currentY, optW, boxH, 15, borderGlow);

      // Draw option circle (A, B, C, D)
      ctx.fillStyle = borderGlow ? borderGlow : "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(65, currentY + boxH / 2, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String.fromCharCode(65 + i), 65, currentY + boxH / 2 + 5);

      // Draw text
      ctx.textAlign = "left";
      ctx.font = `bold ${fontSize}px sans-serif`;
      this.wrapText(
        ctx,
        opt,
        100,
        currentY + boxH / 2 - ((lines - 1) * (fontSize + 6)) / 2 + 5,
        optW - 120,
        fontSize + 6,
      );

      ctx.restore();
      currentY += boxH + 12;
    });

    // 6. Explanation Tip Card (Only on reveal)
    if (isCorrectRevealed && quiz.explanation) {
      const expY = currentY + 10;
      this.drawGlassCard(ctx, 35, expY, optW, 90, 15, "#38BDF8");
      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("💡 Tip:", 50, expY + 25);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "italic 14px sans-serif";
      this.wrapText(ctx, quiz.explanation, 50, expY + 48, optW - 30, 20);
    }

    // 7. Animated Shrinking Timer Bar
    if (timerProgress > 0 && !isCorrectRevealed) {
      const barW = optW;
      const barH = 8;
      const barX = 35;
      const barY = currentY + 15;

      // Base bar slot
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();

      // Shrunk progress bar
      ctx.fillStyle = "#FF4A4A"; // Coral Red
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * timerProgress, barH, 4);
      ctx.fill();
    }

    return canvas.toBuffer("image/png");
  }

  // Render Outro Branding Frame
  renderOutroFrame(logoImage, palette) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext("2d");
    this.drawBackground(ctx, 10.0, palette);

    const cardW = this.width - 60,
      cardH = 460,
      cardY = 160;
    this.drawGlassCard(ctx, 30, cardY, cardW, cardH, 25);

    if (logoImage) {
      const logoSize = 100;
      ctx.drawImage(
        logoImage,
        this.width / 2 - logoSize / 2,
        cardY + 45,
        logoSize,
        logoSize,
      );
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Angrezi Pitara", this.width / 2, cardY + 180);

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText("Learn English Daily with Fun!", this.width / 2, cardY + 210);

    const drawButton = (y, text, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(this.width / 2 - 120, y, 240, 46, 23);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(text, this.width / 2, y + 28);
    };

    drawButton(cardY + 260, "PLAY STORE", "#0EA5E9");
    drawButton(cardY + 325, "TELEGRAM", "#10B981");

    return canvas.toBuffer("image/png");
  }

  // Orchestrator method to render full video
  async renderVideo(quiz, audioChunks, filename) {
    const outputPath = path.join(this.outputDir, `${filename}.mp4`);
    const palette = ["#0F172A", "#1E293B"]; // Dark Indigo Palette

    let logoImage = null;
    try {
      if (fs.existsSync(this.appIconPath))
        logoImage = await loadImage(this.appIconPath);
    } catch (e) {}

    // Calculate durations of each phase
    const durIntro = await this.getAudioDuration(audioChunks.intro);
    const durOpts = [];
    for (const optPath of audioChunks.options) {
      durOpts.push(await this.getAudioDuration(optPath));
    }
    const durThink = await this.getAudioDuration(audioChunks.think);
    const durAnswer = await this.getAudioDuration(audioChunks.answer);
    const durOutro = await this.getAudioDuration(audioChunks.outro);

    const fps = 15; // Sufficient for smooth progress bar and transitions
    const framePaths = [];

    let totalFrames = 0;
    const writeFrame = (buffer) => {
      const fPath = path.join(
        this.tempDir,
        `frame_${totalFrames.toString().padStart(5, "0")}.png`,
      );
      fs.writeFileSync(fPath, buffer);
      framePaths.push(fPath);
      totalFrames++;
    };

    console.log("[Renderer] Rendering Phase 1: Intro/Question...");
    const framesIntro = Math.round(durIntro * fps);
    for (let f = 0; f < framesIntro; f++) {
      const timeSeed = f / fps;
      const buffer = this.renderFrame(
        quiz,
        -1,
        false,
        0,
        timeSeed,
        logoImage,
        palette,
      );
      writeFrame(buffer);
    }

    console.log("[Renderer] Rendering Phase 2: Options Reading...");
    durOpts.forEach((dur, optIdx) => {
      const frames = Math.round(dur * fps);
      for (let f = 0; f < frames; f++) {
        const timeSeed = (framesIntro + f) / fps;
        const buffer = this.renderFrame(
          quiz,
          optIdx,
          false,
          0,
          timeSeed,
          logoImage,
          palette,
        );
        writeFrame(buffer);
      }
    });

    console.log("[Renderer] Rendering Phase 3: Countdown...");
    const framesThink = Math.round(durThink * fps);
    for (let f = 0; f < framesThink; f++) {
      const timeSeed = f / fps;
      const progress = 1.0 - f / framesThink;
      const buffer = this.renderFrame(
        quiz,
        -1,
        false,
        progress,
        timeSeed,
        logoImage,
        palette,
      );
      writeFrame(buffer);
    }

    console.log("[Renderer] Rendering Phase 4: Answer Reveal...");
    const framesAnswer = Math.round(durAnswer * fps);
    for (let f = 0; f < framesAnswer; f++) {
      const timeSeed = f / fps;
      const buffer = this.renderFrame(
        quiz,
        -1,
        true,
        0,
        timeSeed,
        logoImage,
        palette,
      );
      writeFrame(buffer);
    }

    console.log("[Renderer] Rendering Phase 5: Outro / Branding...");
    const framesOutro = Math.round(durOutro * fps);
    const outroBuffer = this.renderOutroFrame(logoImage, palette);
    for (let f = 0; f < framesOutro; f++) {
      writeFrame(outroBuffer);
    }

    console.log(
      `[Renderer] Generated ${totalFrames} frames. Combining with audio using FFmpeg...`,
    );

    // We need to concat all audios together with a clean mix
    const concatList = [];
    concatList.push(`-i "${audioChunks.intro}"`);
    audioChunks.options.forEach((optPath) =>
      concatList.push(`-i "${optPath}"`),
    );
    concatList.push(`-i "${audioChunks.think}"`);
    concatList.push(`-i "${audioChunks.answer}"`);
    concatList.push(`-i "${audioChunks.outro}"`);

    // Let's create procedural tick-tock audio during the think/countdown phase
    const tickTockPath = path.join(this.tempDir, "ticktock.mp3");
    // Generate tick-tock using a periodic sine filter
    const createTickTock = `ffmpeg -f lavfi -i "sine=frequency=800:duration=0.08" -f lavfi -i "sine=frequency=600:duration=0.08" -filter_complex "[0:a]adelay=0|0[a1];[1:a]adelay=1000|1000[a2];[0:a]adelay=2000|2000[a3];[a1][a2][a3]amix=inputs=3" -y "${tickTockPath}"`;
    await new Promise((res, rej) => {
      exec(createTickTock, (err) => {
        if (err) return rej(err);
        res();
      });
    });

    // Create correct-answer ding sound
    const dingPath = path.join(this.tempDir, "ding.mp3");
    const createDing = `ffmpeg -f lavfi -i "sine=frequency=1100:duration=0.4" -y "${dingPath}"`;
    await new Promise((res, rej) => {
      exec(createDing, (err) => {
        if (err) return rej(err);
        res();
      });
    });

    const allAudioInputs = [
      ...concatList,
      `-i "${tickTockPath}"`,
      `-i "${dingPath}"`,
    ];

    if (fs.existsSync(this.bgMusicPath)) {
      allAudioInputs.push(`-i "${this.bgMusicPath}"`);
    }

    const voiceCount = 8;
    let voiceConcatStr = "";
    for (let i = 0; i < voiceCount; i++) voiceConcatStr += `[${i}:a]`;
    voiceConcatStr += `concat=n=${voiceCount}:v=0:a=1[voice_raw]`;

    const delayTickTockMs = Math.round(
      (durIntro + durOpts.reduce((a, b) => a + b, 0)) * 1000,
    );
    const delayDingMs = Math.round(
      (durIntro + durOpts.reduce((a, b) => a + b, 0) + durThink) * 1000,
    );

    let audioMixStr = `${voiceConcatStr};`;
    audioMixStr += `[8:a]adelay=${delayTickTockMs}|${delayTickTockMs}[sfx_tock];`;
    audioMixStr += `[9:a]adelay=${delayDingMs}|${delayDingMs}[sfx_ding];`;

    if (fs.existsSync(this.bgMusicPath)) {
      audioMixStr += `[10:a]volume=0.06,aloop=loop=-1:size=2e9[bg_music];`;
      audioMixStr += `[voice_raw][sfx_tock][sfx_ding][bg_music]amix=inputs=4:duration=shortest[final_audio]`;
    } else {
      audioMixStr += `[voice_raw][sfx_tock][sfx_ding]amix=inputs=3:duration=shortest[final_audio]`;
    }

    const ffmpegCmd = `ffmpeg -framerate ${fps} -i "${path.join(this.tempDir, "frame_%05d.png")}" ${allAudioInputs.join(" ")} -filter_complex "${audioMixStr}" -map 0:v -map "[final_audio]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k -y "${outputPath}"`;

    return new Promise((resolve, reject) => {
      exec(ffmpegCmd, (err) => {
        framePaths.forEach((f) => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
        if (fs.existsSync(tickTockPath)) fs.unlinkSync(tickTockPath);
        if (fs.existsSync(dingPath)) fs.unlinkSync(dingPath);

        if (err)
          return reject(
            new Error(`FFmpeg video assembly failed: ${err.message}`),
          );
        resolve(outputPath);
      });
    });
  }
}

module.exports = PremiumRenderer;

module.exports = {
  brand: {
    name: 'Angrezi Pitara',
    appLink: 'https://play.google.com/store/apps/details?id=com.angrezipitara',
    telegram: 'https://t.me/angreziPitara',
  },
  design: {
    // Premium dark mode palette
    darkSoftBGColors: [
      // Deep Blues
      '#0d1b2a', '#102a43', '#0b2545', '#14213d', '#1b263b',
      '#1c2a44', '#162447', '#1f3a5f', '#223a5e', '#1a365d',
    
      // Navy + Indigo
      '#1a1a2e', '#16213e', '#1b1b3a', '#22223b', '#2b2d42',
      '#2c2c54', '#30336b', '#2f3640', '#2d3436', '#2c3e50',
    
      // Dark Teal / Cyan
      '#0f2f2f', '#123c3c', '#134e4a', '#0e3b43', '#164e63',
      '#1b4332', '#1f6f78', '#2a6f73', '#1e4d4d', '#1c5253',
    
      // Dark Green
      '#1b2f23', '#1f3d2b', '#243d2e', '#1e5128', '#2d6a4f',
      '#2b7a78', '#254d32', '#1c4532', '#2f5233', '#344e41',
    
      // Dark Purple / Violet
      '#240046', '#2c003e', '#3c096c', '#3a0ca3', '#2a004f',
      '#3f0071', '#4a0e4e', '#5a189a', '#3b1c32', '#432371',
    
      // Dark Pink / Magenta tones
      '#3a0f2b', '#4a0f2c', '#5c1a33', '#6a1b4d', '#7b2cbf',
      '#5a0f2e', '#4c1d3d', '#6d214f', '#7a1e48', '#52154e',
    
      // Dark Red / Maroon
      '#3b0d0c', '#4a0e0e', '#5a0f0f', '#6a040f', '#7f1d1d',
      '#8b0000', '#7a1c1c', '#5c0f14', '#4e0f0f', '#601417',
    
      // Dark Brown / Warm tones
      '#2b1d0e', '#3b2f2f', '#4e342e', '#3e2723', '#5d4037',
      '#4a2c2a', '#6d4c41', '#593c2f', '#4b3832', '#3e2723',
    
      // Slate / Neutral with color hint
      '#1f2933', '#273c2c', '#2f3e46', '#2d3142', '#3a3f58',
      '#2e3440', '#3b4252', '#434c5e', '#2f4858', '#3a506b',
    
      // Extra balanced dark tones
      '#1c1c2b', '#202040', '#1b2631', '#2c2a4a', '#1a374d',
      '#23395d', '#2a2f4f', '#1f4068', '#162447', '#1b262c'
    ],
    colors: {
      accent: '#38BDF8',     // Sky 400
      text: '#F8FAFC',       // Slate 50
      correct: '#10B981',    // Emerald 500
      secondary: '#94A3B8',  // Slate 400
    },
    gradients: [
      '#0F172A', // Solid fallback
      'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      'linear-gradient(135deg, #020617 0%, #0F172A 100%)'
    ],
    fonts: {
      primary: 'Helvetica-Bold', // Standard robust font
      secondary: 'Helvetica'
    }
  },
  automation: {
    videosPerDay: 6,
    uploadSchedule: ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'],
    outputDir: './videos',
    tempDir: './temp'
  }
};

const LongVideoAutomation = require('./longApp');

async function testLong() {
  console.log('🚀 Starting Long Video (Horizontal) Test...');
  const automation = new LongVideoAutomation();
  
  // Mock uploader to avoid actual upload
  automation.uploader.upload = async () => {
    console.log('[Mock Uploader] Skipping upload for testing.');
    return { id: 'mock_video_id' };
  };

  try {
    // Generate mega quiz with only 2 items for quick testing
    await automation.createMegaQuiz(2);
    console.log('\n✅ Long Video test successful! Check the "long-videos" folder.');
  } catch (err) {
    console.error('\n❌ Long Video test failed:', err);
  }
}

testLong();

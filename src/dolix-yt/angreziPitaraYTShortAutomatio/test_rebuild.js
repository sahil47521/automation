const YouTubeAutomation = require('./app');

async function test() {
  console.log('🚀 Starting Rebuild Verification Test...');
  const automation = new YouTubeAutomation();
  
  // Run for the first quiz item (index 0)
  // We'll mock the uploader to avoid actual uploads during test
  automation.uploader.upload = async () => {
    console.log('[Mock Uploader] Skipping upload for testing.');
    return { id: 'mock_video_id' };
  };

  try {
    await automation.runSingle(0);
    console.log('\n✅ Rebuild verification successful! Check the "videos" folder.');
  } catch (err) {
    console.error('\n❌ Rebuild verification failed:', err);
  }
}

test();

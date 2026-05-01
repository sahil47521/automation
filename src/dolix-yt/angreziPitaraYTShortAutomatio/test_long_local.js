const LongVideoAutomation = require('./longApp');
const path = require('path');

async function testLongLocally() {
    console.log('🧪 Starting Local Mega Quiz Test (3 Quizzes, No Upload)...');
    const automation = new LongVideoAutomation();
    
    // We modify the internal method slightly to skip upload for this test
    // or just call the core rendering part.
    // For simplicity, let's call createMegaQuiz but we'll mock the uploader.
    
    automation.uploader.upload = async (file, meta) => {
        console.log(`\n⏭️ [MOCK UPLOAD] Skipping YouTube upload for test.`);
        console.log(`📄 Metadata: ${meta.title}`);
        return { data: { id: 'MOCK_ID' } };
    };

    try {
        // Generate a small mega quiz of 3 items for quick testing
        await automation.createMegaQuiz(3);
        console.log('\n✅ Local Mega Quiz Test Finished!');
        console.log('Video location: src/dolix-yt/angreziPitaraYTShortAutomatio/long-videos/');
    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

testLongLocally().catch(console.error);

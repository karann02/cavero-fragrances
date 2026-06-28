// test_screen_type.js - Run this to test if screen_type column works
const sequelize = require('./config/db');
const Slider = require('./models/slider');

async function testScreenType() {
  try {
    console.log('=== Testing screen_type column ===');
    
    // Test 1: Check if column exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sliders' AND COLUMN_NAME = 'screen_type'
    `);
    
    console.log('Column info:', results);
    
    // Test 2: Fetch all sliders
    const sliders = await Slider.findAll();
    console.log('\nAll sliders:');
    sliders.forEach(s => {
      console.log(`  ID: ${s.id}, Title: ${s.title}, screen_type: ${s.screen_type}`);
    });
    
    // Test 3: Try to update a slider
    if (sliders.length > 0) {
      const firstSlider = sliders[0];
      console.log(`\nTesting update on slider ID ${firstSlider.id}...`);
      console.log('Before:', { id: firstSlider.id, screen_type: firstSlider.screen_type });
      
      await firstSlider.update({ screen_type: 'mobile' });
      await firstSlider.reload();
      
      console.log('After:', { id: firstSlider.id, screen_type: firstSlider.screen_type });
      
      // Change it back
      await firstSlider.update({ screen_type: 'desktop' });
      console.log('Reverted to desktop');
    }
    
    console.log('\n=== Test completed successfully ===');
    process.exit(0);
  } catch (error) {
    console.error('=== Test failed ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testScreenType();
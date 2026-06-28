// Simple API Test Script
// Run this with: node test-api.js

const http = require('http');

console.log('🧪 Testing Featured Categories API...\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/categories/featured',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        console.log('✅ API Response:');
        console.log(JSON.stringify(response, null, 2));
        console.log('\n📊 Summary:');
        console.log(`   - Success: ${response.success}`);
        console.log(`   - Message: ${response.message}`);
        console.log(`   - Categories found: ${response.data ? response.data.length : 0}`);
        
        if (response.data && response.data.length > 0) {
          console.log('\n📋 Categories:');
          response.data.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.name} (sort_order: ${cat.sort_order}, products: ${cat.product_count})`);
          });
          console.log('\n✅ SUCCESS! Categories are ready to display on homepage!');
        } else {
          console.log('\n⚠️  WARNING: No categories found!');
          console.log('   Make sure you have categories with status = true');
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    } else {
      console.error('❌ API Error:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.log('\n💡 Possible issues:');
  console.log('   1. Backend server is not running');
  console.log('   2. Server is running on a different port');
  console.log('\n🔧 Fix:');
  console.log('   cd backend/auth-service');
  console.log('   npm start');
});

req.end();

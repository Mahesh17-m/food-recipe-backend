// test-uploads.js
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');
const recipesDir = path.join(uploadsDir, 'recipes');

console.log('=== UPLOADS DIRECTORY DIAGNOSTIC ===');
console.log('Uploads directory exists:', fs.existsSync(uploadsDir));
console.log('Recipes directory exists:', fs.existsSync(recipesDir));

if (fs.existsSync(recipesDir)) {
  const files = fs.readdirSync(recipesDir);
  console.log('Files in recipes directory:', files);
  
  // Check if any files have @ symbols
  const filesWithAt = files.filter(file => file.includes('@'));
  if (filesWithAt.length > 0) {
    console.log('❌ Files with @ symbols found:', filesWithAt);
  } else {
    console.log('✅ No files with @ symbols found');
  }
  
  // Check file permissions
  files.forEach(file => {
    const filePath = path.join(recipesDir, file);
    const stats = fs.statSync(filePath);
    console.log(`File: ${file}, Size: ${stats.size} bytes, Permissions: ${stats.mode.toString(8)}`);
  });
}

console.log('=== SERVER CONFIGURATION ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
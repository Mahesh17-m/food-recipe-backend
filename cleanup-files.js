// cleanup-files.js
const fs = require('fs');
const path = require('path');

const recipesDir = path.join(__dirname, 'uploads', 'recipes');

console.log('Cleaning up existing files...');

if (fs.existsSync(recipesDir)) {
  const files = fs.readdirSync(recipesDir);
  
  files.forEach(file => {
    if (file.startsWith('@')) {
      const oldPath = path.join(recipesDir, file);
      const newName = file.replace(/@/g, '');
      const newPath = path.join(recipesDir, newName);
      
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renamed: ${file} -> ${newName}`);
      } catch (error) {
        console.error(`❌ Error renaming ${file}:`, error.message);
      }
    }
  });
  
  console.log('Cleanup completed!');
} else {
  console.log('Recipes directory not found');
}
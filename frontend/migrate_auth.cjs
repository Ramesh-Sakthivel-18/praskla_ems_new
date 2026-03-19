const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('d:/ramesh/praskla/hikvision-ems-full/frontend/app', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    if (content.includes('firebaseToken')) {
      content = content.replace(/firebaseToken/g, 'token');
      modified = true;
    }
    if (content.includes('@/lib/firebaseClient')) {
      content = content.replace(/@\/lib\/firebaseClient/g, '@/lib/api');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});

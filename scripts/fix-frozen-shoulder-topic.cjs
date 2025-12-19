const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'content', 'fraga-doktorn');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

let updated = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Byt topic från frozen-shoulder-frusen-axel till frozen-shoulder
  if (content.includes('topic: "frozen-shoulder-frusen-axel"')) {
    content = content.replace('topic: "frozen-shoulder-frusen-axel"', 'topic: "frozen-shoulder"');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Uppdaterade: ${file}`);
    updated++;
  }
});

console.log(`\nTotalt uppdaterade: ${updated} filer`);





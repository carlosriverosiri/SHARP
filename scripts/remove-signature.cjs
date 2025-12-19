const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'content', 'fraga-doktorn');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

console.log(`\n🔧 Tar bort signatur från ${files.length} filer...\n`);

let updated = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Ta bort signaturen och divider-linjen före den
  const patterns = [
    /\n---\n\*Dr\. Carlos Rivero Siri, specialist i ortopedi\*\s*$/,
    /\n---\n_Dr\. Carlos Rivero Siri, specialist i ortopedi_\s*$/,
    /\n\n---\n\*Dr\. Carlos Rivero Siri, specialist i ortopedi\*\s*$/,
    /\n\n---\n_Dr\. Carlos Rivero Siri, specialist i ortopedi_\s*$/,
    /\n\/Carlos Rivero Siri\s*$/,
    /\n\/Carlos\s*$/,
    /\nCarlos Rivero Siri\s*$/,
    /\nMVH\s*$/i,
  ];
  
  let changed = false;
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      changed = true;
    }
  });
  
  if (changed) {
    // Ta bort eventuella trailing newlines
    content = content.trimEnd() + '\n';
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}`);
    updated++;
  }
});

console.log(`\n${'='.repeat(40)}`);
console.log(`Uppdaterade: ${updated} filer`);
console.log(`${'='.repeat(40)}\n`);





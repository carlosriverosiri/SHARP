const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'content', 'fraga-doktorn');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

console.log(`Fixar formatering i ${files.length} filer...\n`);

let fixed = 0;

files.forEach(file => {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf-8');
  const original = content;
  
  // Separera frontmatter och body
  const parts = content.split('---');
  if (parts.length < 3) return;
  
  const frontmatter = parts[1];
  let body = parts.slice(2).join('---').trim();
  
  // Ta bort inledande och avslutande * från body (kursiv)
  body = body.replace(/^\*+\s*/, '').replace(/\s*\*+$/, '');
  
  // Ta bort dubbla asterisker (** **)
  body = body.replace(/\*\*\s*\*\*/g, '');
  
  // Ta bort inledande/avslutande kursiv om det omger hela texten
  if (body.startsWith('*') && body.endsWith('*')) {
    body = body.slice(1, -1).trim();
  }
  
  // Ta bort /Carlos Rivero Siri signatur om den finns i slutet
  body = body.replace(/\s*\/\s*Carlos Rivero S(iri)?\.?\s*$/i, '');
  body = body.replace(/\s*\/\s*Carlos Rivero Siri,?\s*(specialist i ortopedi\.?)?\s*$/i, '');
  
  // Lägg till en avslutande signatur
  if (!body.includes('Dr. Carlos')) {
    body = body.trim() + '\n\n---\n*Dr. Carlos Rivero Siri, specialist i ortopedi*';
  }
  
  // Sätt ihop igen
  const newContent = `---${frontmatter}---\n\n${body}\n`;
  
  if (newContent !== original) {
    fs.writeFileSync(filepath, newContent);
    console.log(`✅ Fixade: ${file}`);
    fixed++;
  }
});

console.log(`\n========================================`);
console.log(`Fixade: ${fixed} filer`);
console.log(`========================================`);







const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'ac-ledsartros');

// Hitta alla PNG-filer
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));

console.log(`\n🖼️  Optimerar ${files.length} PNG-filer...\n`);

let totalSaved = 0;

async function optimizeImages() {
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(inputDir, file.replace('.png', '.webp'));
    
    const originalSize = fs.statSync(inputPath).size;
    
    try {
      // Optimera med sharp - behåll rimlig storlek för medicinska bilder
      await sharp(inputPath)
        .resize(1200, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: 85 })
        .toFile(outputPath);
      
      const newSize = fs.statSync(outputPath).size;
      const saved = originalSize - newSize;
      const percent = ((saved / originalSize) * 100).toFixed(1);
      totalSaved += saved;
      
      console.log(`✅ ${file}`);
      console.log(`   ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (-${percent}%)\n`);
    } catch (err) {
      console.log(`❌ ${file}: ${err.message}\n`);
    }
  }
  
  console.log(`${'='.repeat(50)}`);
  console.log(`💾 Totalt sparat: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
  console.log(`${'='.repeat(50)}\n`);
}

optimizeImages();









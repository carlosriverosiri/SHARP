/**
 * 🖼️ Bildoptimerings-script
 * 
 * Användning:
 *   node scripts/optimize-images.cjs <mapp>
 * 
 * Exempel:
 *   node scripts/optimize-images.cjs src/assets/images/ny-diagnos/
 *   node scripts/optimize-images.cjs public/images/
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Hämta mapp från argument
const inputDir = process.argv[2];

if (!inputDir) {
  console.log(`
🖼️  Bildoptimerings-script

Användning:
  node scripts/optimize-images.cjs <mapp>

Exempel:
  node scripts/optimize-images.cjs src/assets/images/ny-diagnos/
  node scripts/optimize-images.cjs public/images/

Scriptet konverterar alla PNG och JPG till optimerade WebP-filer.
`);
  process.exit(1);
}

const fullPath = path.resolve(inputDir);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Mappen finns inte: ${fullPath}`);
  process.exit(1);
}

// Hitta alla bild-filer
const files = fs.readdirSync(fullPath).filter(f => 
  f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
);

if (files.length === 0) {
  console.log(`ℹ️  Inga PNG/JPG-filer hittades i: ${fullPath}`);
  process.exit(0);
}

console.log(`\n🖼️  Optimerar ${files.length} bilder i: ${inputDir}\n`);

let totalOriginal = 0;
let totalOptimized = 0;

async function optimizeImages() {
  for (const file of files) {
    const inputPath = path.join(fullPath, file);
    const outputPath = path.join(fullPath, file.replace(/\.(png|jpe?g)$/i, '.webp'));
    
    const originalSize = fs.statSync(inputPath).size;
    totalOriginal += originalSize;
    
    try {
      await sharp(inputPath)
        .resize(1200, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: 85 })
        .toFile(outputPath);
      
      const newSize = fs.statSync(outputPath).size;
      totalOptimized += newSize;
      const saved = originalSize - newSize;
      const percent = ((saved / originalSize) * 100).toFixed(1);
      
      console.log(`✅ ${file}`);
      console.log(`   ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (-${percent}%)\n`);
    } catch (err) {
      console.log(`❌ ${file}: ${err.message}\n`);
    }
  }
  
  const totalSaved = totalOriginal - totalOptimized;
  const totalPercent = ((totalSaved / totalOriginal) * 100).toFixed(1);
  
  console.log(`${'='.repeat(50)}`);
  console.log(`📊 Sammanfattning:`);
  console.log(`   Ursprunglig storlek: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Ny storlek: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   💾 Sparat: ${(totalSaved / 1024 / 1024).toFixed(2)} MB (-${totalPercent}%)`);
  console.log(`${'='.repeat(50)}`);
  console.log(`\n⚠️  Glöm inte att uppdatera import-satserna från .png/.jpg till .webp!\n`);
}

optimizeImages();






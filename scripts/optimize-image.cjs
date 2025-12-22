const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'images', 'carlos-rivero-siri.jpg');
const outputPath = path.join(__dirname, '..', 'public', 'images', 'carlos-rivero-siri.webp');

sharp(inputPath)
  .resize(200, 200, { fit: 'cover' })
  .webp({ quality: 80 })
  .toFile(outputPath)
  .then(info => {
    console.log('✅ Bild optimerad!');
    console.log(`   Original: carlos-rivero-siri.jpg`);
    console.log(`   Ny fil: carlos-rivero-siri.webp`);
    console.log(`   Storlek: ${(info.size / 1024).toFixed(1)} KB`);
  })
  .catch(err => {
    console.error('❌ Fel:', err.message);
  });









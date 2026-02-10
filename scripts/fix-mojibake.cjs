/**
 * fix-mojibake.cjs
 * Fixes UTF-8 mojibake (garbled Swedish characters) in the codebase.
 * Run: node scripts/fix-mojibake.cjs [optional-file-path]
 */

const fs = require('fs');

// UTF-8 mojibake patterns: UTF-8 bytes misinterpreted as Windows-1252
const replacements = [
  ['\u00c3\u00b6', '\u00f6'],  // ÃƒÂ¶ -> Ã¶
  ['\u00c3\u00a4', '\u00e4'],  // ÃƒÂ¤ -> Ã¤
  ['\u00c3\u00a5', '\u00e5'],  // ÃƒÂ¥ -> Ã¥
  ['\u00c3\u0084', '\u00c4'],  // Ãƒâ€ž -> Ã„
  ['\u00c3\u0096', '\u00d6'],  // Ãƒâ€“ -> Ã–
  ['\u00c3\u0085', '\u00c5'],  // Ãƒâ€¦ -> Ã…
  ['\u00c3\u00a9', '\u00e9'],  // ÃƒÂ© -> Ã©
  ['\u00c3\u00a8', '\u00e8'],  // ÃƒÂ¨ -> Ã¨
  ['\u00c3\u00bc', '\u00fc'],  // ÃƒÂ¼ -> Ã¼
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const [bad, good] of replacements) {
    content = content.split(bad).join(good);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + filePath);
    return true;
  }
  return false;
}

// If file path provided, fix that file. Otherwise scan common locations.
const targetFile = process.argv[2];

if (targetFile) {
  if (fs.existsSync(targetFile)) {
    fixFile(targetFile);
  } else {
    console.log('File not found: ' + targetFile);
  }
} else {
  // Scan common problem areas
  const files = [
    'src/pages/admin/kunskapsbas.astro',
    'src/pages/admin/ai-council.astro',
  ];
  
  let fixed = 0;
  for (const f of files) {
    if (fs.existsSync(f) && fixFile(f)) fixed++;
  }
  
  if (fixed === 0) {
    console.log('No mojibake found');
  } else {
    console.log('Fixed ' + fixed + ' file(s)');
  }
}
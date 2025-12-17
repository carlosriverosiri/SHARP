const fs = require('fs');
const path = require('path');

// Läs XML-filen
const xmlPath = 'c:\\Users\\carlo\\Dropbox\\00-Illustrationer\\AC-LED\\ASTRO\\sdermalmsortopedi.WordPress.2025-12-17.xml';
const xml = fs.readFileSync(xmlPath, 'utf-8');

// Hitta alla <item>...</item> block
const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

console.log(`Hittade ${items.length} poster totalt\n`);

// Filtrera poster med kategorin "artros-i-nyckelbensleden"
const acLedPosts = items.filter(item => {
  return item.includes('artros-i-nyckelbensleden') && 
         item.includes('<wp:status><![CDATA[publish]]></wp:status>');
});

console.log(`Hittade ${acLedPosts.length} publicerade poster i kategorin "artros-i-nyckelbensleden"\n`);

// Funktion för att extrahera CDATA-innehåll
function extractCDATA(text, tag) {
  const regex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// Funktion för att extrahera vanlig tagg
function extractTag(text, tag) {
  const regex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`);
  const match = text.match(regex);
  if (match) return match[1].trim();
  
  const regex2 = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`);
  const match2 = text.match(regex2);
  return match2 ? match2[1].trim() : '';
}

// Funktion för att konvertera HTML till Markdown
function htmlToMarkdown(html) {
  if (!html) return '';
  
  return html
    // Ta bort WordPress shortcodes
    .replace(/\[[\w_]+[^\]]*\]/g, '')
    // Konvertera <strong> och <b>
    .replace(/<strong>|<b>/gi, '**')
    .replace(/<\/strong>|<\/b>/gi, '**')
    // Konvertera <em> och <i>
    .replace(/<em>|<i>/gi, '*')
    .replace(/<\/em>|<\/i>/gi, '*')
    // Konvertera <br> och <br/>
    .replace(/<br\s*\/?>/gi, '\n')
    // Konvertera <p>
    .replace(/<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    // Konvertera <h1>, <h2>, etc.
    .replace(/<h1[^>]*>/gi, '\n\n# ')
    .replace(/<\/h1>/gi, '\n')
    .replace(/<h2[^>]*>/gi, '\n\n## ')
    .replace(/<\/h2>/gi, '\n')
    .replace(/<h3[^>]*>/gi, '\n\n### ')
    .replace(/<\/h3>/gi, '\n')
    // Konvertera listor
    .replace(/<ul>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    // Ta bort andra HTML-taggar
    .replace(/<[^>]+>/g, '')
    // Fixa HTML-entiteter
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    // Ta bort överflödiga radbrytningar
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Funktion för att skapa slug
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

// Funktion för att extrahera taggar
function extractTags(item) {
  const tags = [];
  const tagMatches = item.matchAll(/<category domain="post_tag"[^>]*><!\[CDATA\[([^\]]+)\]\]><\/category>/g);
  for (const match of tagMatches) {
    tags.push(match[1].toLowerCase());
  }
  // Lägg till standard-taggar för AC-led
  if (!tags.includes('ac-led')) tags.push('ac-led');
  if (!tags.includes('nyckelbensleden')) tags.push('nyckelbensleden');
  return tags;
}

// Output-mapp
const outputDir = path.join(__dirname, '..', 'src', 'content', 'fraga-doktorn');

// Se till att mappen finns
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let imported = 0;
let skipped = 0;

acLedPosts.forEach((item, index) => {
  const title = extractCDATA(item, 'title');
  const content = extractCDATA(item, 'content:encoded');
  const postDate = extractCDATA(item, 'wp:post_date');
  const postName = extractCDATA(item, 'wp:post_name');
  
  // Skippa om ingen titel eller innehåll
  if (!title || !content || content.length < 50) {
    console.log(`Skippar: "${title}" (för kort innehåll)`);
    skipped++;
    return;
  }
  
  // Skippa om det bara är en shortcode
  if (content.match(/^\[[\w_]+[^\]]*\]$/)) {
    console.log(`Skippar: "${title}" (bara shortcode)`);
    skipped++;
    return;
  }
  
  // Konvertera innehåll
  const markdown = htmlToMarkdown(content);
  
  // Försök separera fråga och svar
  // Ofta är frågan i början och svaret i kursiv (<em>) eller efter "Svar:" eller liknande
  let question = '';
  let answer = markdown;
  
  // Om svaret börjar med kursiv text (*...*) är det troligen svaret
  // och texten före är frågan
  const parts = markdown.split(/\n\n\*[^*]+\*/);
  if (parts.length > 1 && parts[0].length > 20) {
    question = parts[0].replace(/^\*|\*$/g, '').trim();
    answer = markdown.substring(parts[0].length).trim();
  }
  
  // Skapa datum
  const date = postDate ? postDate.split(' ')[0] : '2020-01-01';
  
  // Skapa slug
  const slug = postName || createSlug(title);
  
  // Skapa filnamn
  const filename = `${slug}.md`;
  const filepath = path.join(outputDir, filename);
  
  // Kolla om filen redan finns
  if (fs.existsSync(filepath)) {
    console.log(`Finns redan: ${filename}`);
    skipped++;
    return;
  }
  
  // Skapa SEO-beskrivning (max 160 tecken)
  const description = markdown
    .replace(/[#*_]/g, '')
    .replace(/\n/g, ' ')
    .substring(0, 155)
    .trim() + '...';
  
  // Extrahera taggar
  const tags = extractTags(item);
  
  // Skapa frontmatter
  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
category: "axel"
tags: ${JSON.stringify(tags)}
date: ${date}
author: "Dr. Carlos Rivero Siri"
relatedCondition: "/sjukdomar/axel/ac-ledsartros"
published: true
question: |
  ${question || '(Frågan behöver extraheras manuellt från svaret)'}
---

${answer}
`;

  // Skriv fil
  fs.writeFileSync(filepath, frontmatter);
  console.log(`✅ Skapade: ${filename}`);
  imported++;
});

console.log(`\n========================================`);
console.log(`Importerade: ${imported} frågor`);
console.log(`Skippade: ${skipped} poster`);
console.log(`========================================`);



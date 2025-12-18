const fs = require('fs');
const path = require('path');

// Konfiguration
const XML_PATH = process.argv[2] || 'C:\\Users\\carlo\\Dropbox\\00-Illustrationer\\AC-LED\\ASTRO\\sdermalmsortopedi.WordPress.2025-12-17.xml';
const CATEGORY_FILTER = process.argv[3] || 'impingement'; // Kan vara: impingement, rotatorcuffruptur, etc.

console.log(`\n📂 Läser: ${XML_PATH}`);
console.log(`🔍 Filtrerar på kategori: ${CATEGORY_FILTER}\n`);

const xml = fs.readFileSync(XML_PATH, 'utf-8');

// Extrahera alla items
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
const items = [];
let match;
while ((match = itemRegex.exec(xml)) !== null) {
  items.push(match[1]);
}

console.log(`Hittade ${items.length} poster totalt\n`);

// Filtrera på kategori
const relevantPosts = items.filter(item => {
  return item.includes(`nicename="${CATEGORY_FILTER}"`);
});

console.log(`Hittade ${relevantPosts.length} poster i kategorin "${CATEGORY_FILTER}"\n`);

// Extrahera data
function extractData(item) {
  const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
  const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
  const slugMatch = item.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/);
  const dateMatch = item.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/);
  
  return {
    title: titleMatch ? titleMatch[1] : '',
    content: contentMatch ? contentMatch[1] : '',
    slug: slugMatch ? slugMatch[1] : '',
    date: dateMatch ? dateMatch[1].split(' ')[0] : '2015-01-01'
  };
}

// Rensa HTML
function cleanHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<!--more-->/gi, '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// FÖRBÄTTRAD: Separera fråga och svar
function separateQuestionAnswer(html) {
  // Svaret från doktorn är ALLTID i <em> taggar i WordPress
  // Frågan är den text som INTE är i <em> taggar
  
  // Steg 1: Hitta allt som är i <em> taggar (doktorns svar)
  const emRegex = /<em>([\s\S]*?)<\/em>/gi;
  let answerParts = [];
  let emMatch;
  
  // Samla alla <em> delar
  while ((emMatch = emRegex.exec(html)) !== null) {
    answerParts.push(emMatch[1]);
  }
  
  // Steg 2: Ta bort <em> taggar för att få frågan
  let questionHtml = html.replace(/<em>[\s\S]*?<\/em>/gi, '');
  
  // Om vi hittade svar i <em> taggar
  if (answerParts.length > 0) {
    const question = cleanHtml(questionHtml);
    const answer = cleanHtml(answerParts.join('\n\n'));
    
    // Validera att vi faktiskt har båda delar
    if (question.length > 20 && answer.length > 20) {
      return { question, answer };
    }
  }
  
  // Fallback: Försök hitta svaret baserat på mönster
  const patterns = [
    /^([\s\S]*?)(<p>)?<em>/i,  // Allt före första <em>
    /^([\s\S]*?)(\n\n)(Hej,?\s|Det låter|Du bör|Min rekommendation|Om du har|Vid |Smärtor |En |Det är |Kortisoninjektionen)/m
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const questionPart = match[1];
      const answerPart = html.substring(questionPart.length);
      
      const question = cleanHtml(questionPart);
      const answer = cleanHtml(answerPart);
      
      if (question.length > 20 && answer.length > 20) {
        return { question, answer };
      }
    }
  }
  
  // Sista fallback: dela på hälften baserat på <!--more--> om det finns
  if (html.includes('<!--more-->')) {
    const parts = html.split('<!--more-->');
    if (parts.length >= 2) {
      return {
        question: cleanHtml(parts[0]),
        answer: cleanHtml(parts.slice(1).join('\n\n'))
      };
    }
  }
  
  // Om inget fungerar, returnera allt som fråga och tom answer
  console.log('  ⚠️  Kunde inte separera fråga/svar - manuell granskning behövs');
  return {
    question: cleanHtml(html),
    answer: '[MANUELL GRANSKNING BEHÖVS - svaret kunde inte extraheras automatiskt]'
  };
}

// Skapa markdown
function createMarkdown(data, topic) {
  const { question, answer } = separateQuestionAnswer(data.content);
  
  // Ta bort eventuell signatur från svaret
  let cleanAnswer = answer
    .replace(/\/?Carlos Rivero Siri\.?/gi, '')
    .replace(/\/Carlos/gi, '')
    .replace(/Carlos Rivero S\.?/gi, '')
    .trim();
  
  // Formatera svaret med styckebrytningar om det saknas
  if (cleanAnswer.length > 200 && !cleanAnswer.includes('\n\n')) {
    cleanAnswer = cleanAnswer.replace(/\. ([A-ZÅÄÖ])/g, '.\n\n$1');
  }
  
  // Skapa sammanfattning baserad på innehåll
  const summaryPoints = [];
  const answerLower = cleanAnswer.toLowerCase();
  
  if (answerLower.includes('operation')) summaryPoints.push('Operation kan vara aktuellt');
  if (answerLower.includes('mr') || answerLower.includes('magnetkamera') || answerLower.includes('röntgen')) {
    summaryPoints.push('Utredning med bilddiagnostik rekommenderas');
  }
  if (answerLower.includes('sjukgymnast') || answerLower.includes('fysioterapi') || answerLower.includes('träning')) {
    summaryPoints.push('Sjukgymnastik/träning kan hjälpa');
  }
  if (answerLower.includes('specialist') || answerLower.includes('ortoped')) {
    summaryPoints.push('Sök remiss till specialist');
  }
  if (answerLower.includes('kortison')) summaryPoints.push('Kortisoninjektion kan övervägas');
  if (answerLower.includes('vila') || answerLower.includes('avlastning')) {
    summaryPoints.push('Vila och avlastning rekommenderas');
  }
  
  if (summaryPoints.length === 0) {
    summaryPoints.push('Kontakta läkare för individuell bedömning');
  }
  
  // Formatera frågan med Hej! om det saknas
  let formattedQuestion = question.trim();
  if (!formattedQuestion.toLowerCase().startsWith('hej')) {
    formattedQuestion = 'Hej!\n\n' + formattedQuestion;
  }
  
  // Skapa tags
  const tags = [topic];
  if (data.content.toLowerCase().includes('operation')) tags.push('operation');
  if (data.content.toLowerCase().includes('styrketräning') || data.content.toLowerCase().includes('gym')) tags.push('styrketräning');
  if (data.content.toLowerCase().includes('smärta') || data.content.toLowerCase().includes('ont')) tags.push('smärta');
  
  // Skapa beskrivning
  const description = formattedQuestion.replace(/\n/g, ' ').substring(0, 150).trim() + '...';

  return `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
category: "axel"
topic: "${topic}"
tags: [${[...new Set(tags)].map(t => `"${t}"`).join(', ')}]
date: ${data.date}
author: "Dr. Carlos Rivero Siri"
published: true
question: |
${formattedQuestion.split('\n').map(l => '  ' + l).join('\n')}
---

${cleanAnswer}

**Sammanfattning:**
${summaryPoints.slice(0, 4).map(p => '- ' + p).join('\n')}
`;
}

// Skapa slug
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// Kör import
const outputDir = path.join(__dirname, '..', 'src', 'content', 'fraga-doktorn');

let created = 0;
let skipped = 0;
let needsReview = 0;

for (const item of relevantPosts) {
  const data = extractData(item);
  
  if (!data.title || !data.content) {
    skipped++;
    continue;
  }
  
  const slug = data.slug || createSlug(data.title);
  const filePath = path.join(outputDir, `${slug}.md`);
  
  // Hoppa över om filen redan finns
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  Finns redan: ${slug}`);
    skipped++;
    continue;
  }
  
  const markdown = createMarkdown(data, CATEGORY_FILTER);
  
  if (markdown.includes('[MANUELL GRANSKNING BEHÖVS]')) {
    needsReview++;
  }
  
  fs.writeFileSync(filePath, markdown, 'utf-8');
  console.log(`✅ Skapade: ${slug}`);
  created++;
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Skapade: ${created} filer`);
console.log(`⏭️  Hoppade över: ${skipped} filer`);
if (needsReview > 0) {
  console.log(`⚠️  Behöver manuell granskning: ${needsReview} filer`);
}
console.log(`${'='.repeat(50)}\n`);




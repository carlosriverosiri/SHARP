// Ämnesstruktur för Fråga Doktorn
// Organiserar frågor efter smärtlokalisation, diagnos, skada eller övrigt

export interface Topic {
  id: string;
  title: string;
  shortTitle?: string; // Kortare titel för menyer
  description: string;
  category: TopicCategory;
  bodyPart: BodyPart;
  relatedConditionUrl?: string; // Länk till diagnossida om sådan finns
}

export type TopicCategory = 'smartlokalisation' | 'diagnoser' | 'skador' | 'ovrigt';
export type BodyPart = 'axel' | 'kna' | 'armbage';

export const categoryLabels: Record<TopicCategory, string> = {
  smartlokalisation: 'Smärtlokalisation',
  diagnoser: 'Diagnoser',
  skador: 'Skador & Instabilitet',
  ovrigt: 'Övrigt',
};

export const categoryDescriptions: Record<TopicCategory, string> = {
  smartlokalisation: 'Frågor baserat på var smärtan sitter',
  diagnoser: 'Frågor om specifika diagnoser och tillstånd',
  skador: 'Frågor om skador, urledvridningar och instabilitet',
  ovrigt: 'Frågor om behandling, utredning och övrigt',
};

export const bodyPartLabels: Record<BodyPart, string> = {
  axel: 'Axel',
  kna: 'Knä',
  armbage: 'Armbåge',
};

// ============================================
// AXEL-ÄMNEN
// ============================================

export const topics: Topic[] = [
  // --- SMÄRTLOKALISATION (Axel) ---
  {
    id: 'ont-i-axeln',
    title: 'Ont i axeln (allmänt)',
    shortTitle: 'Ont i axeln',
    description: 'Generella frågor om axelsmärta där orsaken är oklar',
    category: 'smartlokalisation',
    bodyPart: 'axel',
  },
  {
    id: 'ont-ovansidan-axeln',
    title: 'Ont på ovansidan av axeln',
    shortTitle: 'Ovansidan (nyckelbensleden)',
    description: 'Smärta på ovansidan av axeln, ofta relaterat till nyckelbensleden',
    category: 'smartlokalisation',
    bodyPart: 'axel',
  },
  {
    id: 'ont-utsidan-axeln',
    title: 'Ont på utsidan av axeln',
    shortTitle: 'Utsidan (rotatorkuffen)',
    description: 'Smärta på utsidan av axeln, ofta relaterat till rotatorkuffen',
    category: 'smartlokalisation',
    bodyPart: 'axel',
  },
  {
    id: 'ont-bicepssenan',
    title: 'Ont i bicepssenan',
    shortTitle: 'Bicepssenan',
    description: 'Smärta i övre eller nedre bicepssenan',
    category: 'smartlokalisation',
    bodyPart: 'axel',
  },
  {
    id: 'ont-skulderbladet',
    title: 'Ont i skulderbladet',
    shortTitle: 'Skulderbladet',
    description: 'Smärta kring eller under skulderbladet',
    category: 'smartlokalisation',
    bodyPart: 'axel',
  },

  // --- DIAGNOSER (Axel) ---
  {
    id: 'ac-ledsartros',
    title: 'AC-ledsartros',
    description: 'Förslitning av brosket i nyckelbensleden (akromioklavikularleden)',
    category: 'diagnoser',
    bodyPart: 'axel',
    relatedConditionUrl: '/sjukdomar/axel/ac-ledsartros',
  },
  {
    id: 'weightlifters-shoulder',
    title: "Weightlifter's shoulder",
    description: 'Uppluckring av yttre nyckelbensändan vid styrketräning (distal klavikulär osteolys)',
    category: 'diagnoser',
    bodyPart: 'axel',
    relatedConditionUrl: '/sjukdomar/axel/ac-ledsartros',
  },
  {
    id: 'impingement',
    title: 'Impingement',
    shortTitle: 'Impingement (inklämd sena)',
    description: 'Inklämning av senor under axelns tak',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'frozen-shoulder',
    title: 'Frozen shoulder',
    description: 'Tilltagande stelhet och smärta i axelleden (frusen axel)',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'kalkaxel',
    title: 'Kalkaxel',
    description: 'Kalkinlagring i rotatorkuffens senor',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'rotatorcuffruptur',
    title: 'Rotatorcuffruptur',
    shortTitle: 'Rotatorcuffskada',
    description: 'Skada eller bristning i rotatorkuffens senor',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'proximal-bicepsruptur',
    title: 'Proximal bicepsruptur',
    shortTitle: 'Övre bicepsruptur',
    description: 'Bristning av övre (långa) bicepssenan vid axeln',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'axelledsartros',
    title: 'Axelledsartros',
    description: 'Förslitning av brosket i själva axelleden',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'snapping-shoulder',
    title: 'Snapping shoulder / scapula',
    shortTitle: 'Snapping shoulder',
    description: 'Knäppande eller skrapande ljud från skulderbladet eller axeln vid rörelse',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'snapping-scapula',
    title: 'Snapping scapula',
    shortTitle: 'Snapping scapula',
    description: 'Knäppande eller skrapande ljud från skulderbladet mot revbenen',
    category: 'diagnoser',
    bodyPart: 'axel',
  },
  {
    id: 'suprascapularis-inklämning',
    title: 'Nervus suprascapularis inklämning',
    shortTitle: 'Nervinklämning (n. suprascapularis)',
    description: 'Inklämning av nervus suprascapularis som ger svaghet i utåtrotation och/eller abduktion',
    category: 'diagnoser',
    bodyPart: 'axel',
    relatedConditionUrl: '/en/diseases/shoulder/suprascapular-neuropathy',
  },

  // --- SKADOR & INSTABILITET (Axel) ---
  {
    id: 'axeln-ur-led',
    title: 'Axeln ur led',
    shortTitle: 'Axelluxation',
    description: 'Urledvridning av axelleden (luxation)',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'nyckelbenet-ur-led',
    title: 'Nyckelbenet ur led',
    shortTitle: 'AC-ledsluxation',
    description: 'Urledvridning av nyckelbensleden',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'labrumskada',
    title: 'Labrumskada / SLAP',
    shortTitle: 'Labrumskada',
    description: 'Skada på ledläppen (labrum) i axelleden',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'bankartskada',
    title: 'Bankartskada',
    description: 'Skada på främre labrum efter luxation',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'instabilitet',
    title: 'Axelinstabilitet',
    shortTitle: 'Instabilitet',
    description: 'Instabilitet i axelleden (främre, bakre eller generell)',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'overrorlighet',
    title: 'Överrörlighet (hyperlaxitet)',
    shortTitle: 'Överrörlighet',
    description: 'Ökad rörlighet i axelleden som kan leda till instabilitet och smärta',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'fraktur-axel',
    title: 'Frakturer (axel/nyckelben)',
    shortTitle: 'Frakturer',
    description: 'Frågor om frakturer i axelområdet',
    category: 'skador',
    bodyPart: 'axel',
  },
  {
    id: 'pectoralis-ruptur',
    title: 'Pectoralis major ruptur',
    shortTitle: 'Pectoralis ruptur',
    description: 'Bristning av stora bröstmuskeln, vanligt vid styrketräning',
    category: 'diagnoser',
    bodyPart: 'axel',
  },

  // --- ÖVRIGT (Axel) ---
  {
    id: 'kortisoninjektion',
    title: 'Kortisoninjektion',
    description: 'Frågor om kortisonbehandling i axeln',
    category: 'ovrigt',
    bodyPart: 'axel',
  },
  {
    id: 'utredning',
    title: 'Utredning (MR, röntgen, ultraljud)',
    shortTitle: 'Utredning',
    description: 'Frågor om röntgen, MR, ultraljud och andra undersökningar',
    category: 'ovrigt',
    bodyPart: 'axel',
  },
  {
    id: 'operation-axel',
    title: 'Operation & rehabilitering',
    shortTitle: 'Operation & rehab',
    description: 'Frågor om operationer och rehabilitering',
    category: 'ovrigt',
    bodyPart: 'axel',
  },
  {
    id: 'knak-knapp',
    title: 'Knak och knäpp i axeln',
    shortTitle: 'Knak & knäpp',
    description: 'Frågor om ljud och knakningar i axeln',
    category: 'ovrigt',
    bodyPart: 'axel',
  },
  {
    id: 'sjukskrivning',
    title: 'Sjukskrivning',
    description: 'Frågor om sjukskrivning vid axelbesvär',
    category: 'ovrigt',
    bodyPart: 'axel',
  },

  // ============================================
  // KNÄ-ÄMNEN
  // ============================================
  
  // --- SMÄRTLOKALISATION (Knä) ---
  {
    id: 'ont-i-knat',
    title: 'Ont i knät (allmänt)',
    shortTitle: 'Ont i knät',
    description: 'Generella frågor om knäsmärta där orsaken är oklar',
    category: 'smartlokalisation',
    bodyPart: 'kna',
  },
  {
    id: 'ont-framsidan-knat',
    title: 'Ont på framsidan av knät',
    shortTitle: 'Framsidan (patella)',
    description: 'Smärta på framsidan av knät, ofta relaterat till knäskålen',
    category: 'smartlokalisation',
    bodyPart: 'kna',
  },
  {
    id: 'ont-insidan-knat',
    title: 'Ont på insidan av knät',
    shortTitle: 'Insidan (medialt)',
    description: 'Smärta på insidan av knät',
    category: 'smartlokalisation',
    bodyPart: 'kna',
  },
  {
    id: 'ont-utsidan-knat',
    title: 'Ont på utsidan av knät',
    shortTitle: 'Utsidan (lateralt)',
    description: 'Smärta på utsidan av knät',
    category: 'smartlokalisation',
    bodyPart: 'kna',
  },
  {
    id: 'ont-baksidan-knat',
    title: 'Ont på baksidan av knät',
    shortTitle: 'Baksidan (knäveck)',
    description: 'Smärta i knävecket eller baksidan av knät',
    category: 'smartlokalisation',
    bodyPart: 'kna',
  },

  // --- DIAGNOSER (Knä) ---
  {
    id: 'knartros',
    title: 'Knäartros',
    description: 'Förslitning av brosket i knäleden',
    category: 'diagnoser',
    bodyPart: 'kna',
  },
  {
    id: 'patellofemoral-smartsyndrom',
    title: 'Patellofemoralt smärtsyndrom',
    shortTitle: 'Patellofemoral smärta',
    description: 'Smärta kring knäskålen, vanligt hos unga och aktiva',
    category: 'diagnoser',
    bodyPart: 'kna',
  },
  {
    id: 'loparklna',
    title: 'Löparknä (ITBS)',
    shortTitle: 'Löparknä',
    description: 'Smärta på utsidan av knät vid löpning (iliotibialbandsyndrom)',
    category: 'diagnoser',
    bodyPart: 'kna',
  },
  {
    id: 'hopparklna',
    title: 'Hopparknä (patellartendinopati)',
    shortTitle: 'Hopparknä',
    description: 'Smärta i patellasenan under knäskålen',
    category: 'diagnoser',
    bodyPart: 'kna',
  },
  {
    id: 'bakercysta',
    title: 'Bakercysta',
    description: 'Vätskefylld cysta i knävecket',
    category: 'diagnoser',
    bodyPart: 'kna',
  },
  {
    id: 'broskskada-kna',
    title: 'Broskskada i knät',
    shortTitle: 'Broskskada',
    description: 'Skada på ledbrosket i knäleden',
    category: 'diagnoser',
    bodyPart: 'kna',
  },

  // --- SKADOR (Knä) ---
  {
    id: 'meniskskada',
    title: 'Meniskskada',
    description: 'Skada på knäts menisker',
    category: 'skador',
    bodyPart: 'kna',
  },
  {
    id: 'korsbandsskada',
    title: 'Korsbandsskada',
    shortTitle: 'Korsband (ACL/PCL)',
    description: 'Skada på främre eller bakre korsband',
    category: 'skador',
    bodyPart: 'kna',
  },
  {
    id: 'sidoledbandsskada',
    title: 'Sidoledbandsskada',
    shortTitle: 'Sidoledband (MCL/LCL)',
    description: 'Skada på inre eller yttre sidoledband',
    category: 'skador',
    bodyPart: 'kna',
  },
  {
    id: 'knaskalen-ur-led',
    title: 'Knäskålen ur led',
    shortTitle: 'Patellaluxation',
    description: 'Urledvridning av knäskålen',
    category: 'skador',
    bodyPart: 'kna',
  },

  // --- ÖVRIGT (Knä) ---
  {
    id: 'kortisoninjektion-kna',
    title: 'Kortisoninjektion i knät',
    shortTitle: 'Kortisoninjektion',
    description: 'Frågor om kortisonbehandling i knät',
    category: 'ovrigt',
    bodyPart: 'kna',
  },
  {
    id: 'operation-kna',
    title: 'Operation & rehabilitering (knä)',
    shortTitle: 'Operation & rehab',
    description: 'Frågor om knäoperationer och rehabilitering',
    category: 'ovrigt',
    bodyPart: 'kna',
  },
  {
    id: 'knaprotes',
    title: 'Knäprotes',
    description: 'Frågor om knäprotesoperationer',
    category: 'ovrigt',
    bodyPart: 'kna',
  },

  // ============================================
  // ARMBÅGE-ÄMNEN
  // ============================================
  
  // --- SMÄRTLOKALISATION (Armbåge) ---
  {
    id: 'ont-i-armbagen',
    title: 'Ont i armbågen (allmänt)',
    shortTitle: 'Ont i armbågen',
    description: 'Generella frågor om armbågssmärta där orsaken är oklar',
    category: 'smartlokalisation',
    bodyPart: 'armbage',
  },
  {
    id: 'ont-utsidan-armbagen',
    title: 'Ont på utsidan av armbågen',
    shortTitle: 'Utsidan (lateralt)',
    description: 'Smärta på utsidan av armbågen',
    category: 'smartlokalisation',
    bodyPart: 'armbage',
  },
  {
    id: 'ont-insidan-armbagen',
    title: 'Ont på insidan av armbågen',
    shortTitle: 'Insidan (medialt)',
    description: 'Smärta på insidan av armbågen',
    category: 'smartlokalisation',
    bodyPart: 'armbage',
  },

  // --- DIAGNOSER (Armbåge) ---
  {
    id: 'tennisarmbage',
    title: 'Tennisarmbåge',
    description: 'Smärta på utsidan av armbågen (lateral epikondylit)',
    category: 'diagnoser',
    bodyPart: 'armbage',
  },
  {
    id: 'golfararmbage',
    title: 'Golfararmbåge',
    description: 'Smärta på insidan av armbågen (medial epikondylit)',
    category: 'diagnoser',
    bodyPart: 'armbage',
  },
  {
    id: 'armbagsledsartros',
    title: 'Armbågsledsartros',
    description: 'Förslitning av brosket i armbågsleden',
    category: 'diagnoser',
    bodyPart: 'armbage',
  },
  {
    id: 'stelhet-armbage',
    title: 'Stelhet i armbågen',
    shortTitle: 'Stelhet',
    description: 'Nedsatt rörlighet och stelhet i armbågsleden',
    category: 'diagnoser',
    bodyPart: 'armbage',
  },

  // --- SKADOR (Armbåge) ---
  {
    id: 'distal-bicepsruptur',
    title: 'Distal bicepsruptur',
    shortTitle: 'Bicepsruptur',
    description: 'Bristning av nedre bicepssenan vid armbågen',
    category: 'skador',
    bodyPart: 'armbage',
  },
  {
    id: 'tricepsruptur',
    title: 'Tricepsruptur',
    description: 'Bristning av tricepssenan',
    category: 'skador',
    bodyPart: 'armbage',
  },
  {
    id: 'armbagsinstabilitet',
    title: 'Armbågsinstabilitet',
    shortTitle: 'Instabilitet',
    description: 'Instabilitet i armbågsleden efter skada',
    category: 'skador',
    bodyPart: 'armbage',
  },

  // --- ÖVRIGT (Armbåge) ---
  {
    id: 'kortisoninjektion-armbage',
    title: 'Kortisoninjektion i armbågen',
    shortTitle: 'Kortisoninjektion',
    description: 'Frågor om kortisonbehandling i armbågen',
    category: 'ovrigt',
    bodyPart: 'armbage',
  },
  {
    id: 'operation-armbage',
    title: 'Operation & rehabilitering (armbåge)',
    shortTitle: 'Operation & rehab',
    description: 'Frågor om armbågsoperationer och rehabilitering',
    category: 'ovrigt',
    bodyPart: 'armbage',
  },
];

// Hjälpfunktioner
export function getTopicById(id: string): Topic | undefined {
  return topics.find(t => t.id === id);
}

export function getTopicsByBodyPart(bodyPart: BodyPart): Topic[] {
  return topics.filter(t => t.bodyPart === bodyPart);
}

export function getTopicsByCategory(bodyPart: BodyPart, category: TopicCategory): Topic[] {
  return topics.filter(t => t.bodyPart === bodyPart && t.category === category);
}

export function getAllCategories(): TopicCategory[] {
  return ['smartlokalisation', 'diagnoser', 'skador', 'ovrigt'];
}


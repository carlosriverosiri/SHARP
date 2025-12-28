// Data om diagnossidor för att visa i Q&A
// Lägg till fler diagnoser här efterhand

export interface ConditionInfo {
  title: string;
  shortDescription: string;
  url: string;
  image?: string; // Sökväg till illustrationsbild
  imageAlt?: string;
}

export const conditions: Record<string, ConditionInfo> = {
  "/sjukdomar/axel/ac-ledsartros": {
    title: "AC-ledsartros",
    shortDescription: "AC-ledsartros är en förslitning av brosket i nyckelbensleden. Tillståndet är vanligt hos personer över 40 år och kan ge smärta på ovansidan av axeln som ibland strålar mot nacken.",
    url: "/sjukdomar/axel/ac-ledsartros",
    image: "/images/diseases/ac-ledsartros/ac-pain-distribution.svg",
    imageAlt: "Illustration som visar smärtutbredning vid AC-ledsartros"
  },
  // Lägg till fler diagnoser här:
  // "/sjukdomar/axel/frusen-axel": { ... },
  // "/sjukdomar/kna/korsbandsskada": { ... },
};

export function getConditionInfo(url: string): ConditionInfo | null {
  return conditions[url] || null;
}


import { defineCollection, z } from 'astro:content';

// Schema för "Fråga doktorn"-frågor
const fragaDoktornCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(['axel', 'kna', 'armbage', 'annat']), // Kroppsdel: axel, knä, armbåge, annat
    topic: z.string().optional(), // Ämne: ac-ledsartros, impingement, ont-ovansidan-axeln, etc.
    tags: z.array(z.string()).optional(),
    date: z.date(),
    author: z.string().default('Dr. Carlos Rivero Siri'),
    relatedCondition: z.string().optional(), // Länk till relaterad sjukdomssida
    published: z.boolean().default(true),
    // Status för arbetsflöde (för obesvarade/utkast)
    status: z.enum(['obesvarad', 'utkast', 'klar']).optional(),
    // Fråga från patienten (visas i separat box)
    question: z.string(),
    patientName: z.string().optional(),
    patientAge: z.number().optional(),
  }),
});

export const collections = {
  'fraga-doktorn': fragaDoktornCollection,
};


export const sectionSlots = {
  'hero-2': { label: 'Portada · foto 2', captionKey: 'heroPhoto2' },
  'hero-3': { label: 'Portada · foto 3', captionKey: 'heroPhoto3' },
  'story-1': { label: 'Su historia · foto 1', captionKey: 'storyPhoto1' },
  'story-2': { label: 'Su historia · foto 2', captionKey: 'storyPhoto2' },
  'story-3': { label: 'Su historia · foto 3', captionKey: 'storyPhoto3' },
  'album-feature': { label: 'Momentos · fotografía con frase', captionKey: 'albumPhoto' },
  'quote-photo': { label: 'Su frase · fotografía', captionKey: 'quotePhoto' },
  'memories-feature': { label: 'Recuerdos · fotografía con frase', captionKey: 'memoriesPhoto' },
  'closing-photo': { label: 'Cierre · fotografía con frase', captionKey: 'closingPhoto' },
} as const;
export type SectionSlot = keyof typeof sectionSlots;
export const slotNames = Object.keys(sectionSlots) as SectionSlot[];
export function isSectionSlot(value: string): value is SectionSlot { return Object.hasOwn(sectionSlots, value); }
export const mediaPlacements = ['album', 'gallery', ...slotNames] as const;

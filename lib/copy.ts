export const pageCopy = {
  eyebrow: 'UN ÁLBUM HECHO DE CARIÑO', heroNote: 'Hay personas que hacen de la vida un hogar.',
  photoTop: 'lo más bonito es lo vivido', photoBottom: 'para tenerte siempre cerca ♡', photoSignature: 'Un instante. Toda una vida.',
  storyLabel: '01 / LAS HUELLAS DE UNA VIDA', storyTitle: 'Una historia que vive', storyEmphasis: 'en nosotros.', signature: 'Con todo el cariño, su familia.',
  albumLabel: '02 / NUESTRO ÁLBUM', albumTitle: 'Pequeños instantes.', albumEmphasis: 'Inmensos recuerdos.', albumDescription: 'Fotografías, historias y su voz.\nUn pedacito de todo lo compartido.',
  albumEmpty: 'Los recuerdos encontrarán su lugar aquí.', albumEmptyDescription: 'Un álbum para esas fotografías y videos que siempre queremos volver a mirar.',
  memoriesLabel: '03 / LO QUE LLEVAMOS DENTRO', memoriesTitle: 'Cada recuerdo,', memoriesEmphasis: 'una forma de abrazar.',
  memoriesEmpty: 'Una anécdota, una enseñanza, una tarde cualquiera.', memoriesEmptyNote: 'El primer recuerdo puede ser el tuyo.',
  shareLabel: 'UNAS PALABRAS QUE SE QUEDAN', shareTitle: '¿Qué recuerdo', shareEmphasis: 'guardas con él?', shareDescription: 'No hace falta escribir algo perfecto.\nSolo algo que nazca del cariño.',
  footer: 'Lo vivido juntos siempre encuentra cómo quedarse.',
};
export type CopyKey = keyof typeof pageCopy;
export type EditableTarget = { type: 'profile'; key: 'name' | 'subtitle' | 'introduction' | 'quote' } | { type: 'copy'; key: CopyKey } | { type: 'media'; id: string; key: 'title' | 'caption' | 'year' };
export type MemorialEditor = { onText: (target: EditableTarget, value: string) => void; onImage: (target: string) => void };

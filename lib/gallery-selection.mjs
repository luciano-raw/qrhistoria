/** @typedef {{id:string,path:string,title:string,caption:string,credit:string,source:'family'|'visitors'}} GalleryPhoto */
/**
 * Keep moderation in the projection as well as the database query.
 * @param {Array<{id:string,path:string,title:string,caption:string,kind:string,published:boolean}>} media
 * @param {Array<{id:string,path:string,memory:{name:string,approved:boolean}}>} memories
 * @returns {GalleryPhoto[]}
 */
export function selectGalleryPhotos(media, memories) {
  /** @type {GalleryPhoto[]} */
  const photos = [];
  for (const item of media) if (item.published && item.kind === 'image') photos.push({ id: `family:${item.id}`, path: item.path, title: item.title, caption: item.caption, credit: 'Su familia', source: 'family' });
  for (const item of memories) if (item.memory.approved) photos.push({ id: `memory:${item.id}`, path: item.path, title: `Un recuerdo de ${item.memory.name}`, caption: '', credit: item.memory.name, source: 'visitors' });
  const seen = new Set();
  return photos.filter(photo => { if (seen.has(photo.path)) return false; seen.add(photo.path); return true; });
}
export function slideIndex(index, direction, length) { return length > 0 ? ((index + direction) % length + length) % length : 0; }
export function slideDuration(value) { const seconds = Number(value); return Number.isFinite(seconds) && seconds >= 3 && seconds <= 30 ? Math.round(seconds) : 8; }

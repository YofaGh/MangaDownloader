export const fixNameForFolder = (manga) => {
  return manga.replace(/[\/:*?"><|]+/g, '').replace(/\.*$/, '');
}
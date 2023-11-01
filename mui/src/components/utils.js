import { convertToPdf, mergeImages } from "../api/utils";

export const fixNameForFolder = (manga) => {
  return manga.replace(/[\/:*?"><|]+/g, "").replace(/\.*$/, "");
};
export const convert = async (webtoon, openPath) => {
  await convertToPdf(
    webtoon.path,
    webtoon.path,
    webtoon.type === "manga"
      ? `${fixNameForFolder(webtoon.title)}_${webtoon.info}`
      : `${webtoon.doujin}_${fixNameForFolder(webtoon.title)}`
  );
  if (openPath) {
    window.do.openFolder(webtoon.path);
  }
};
export const merge = (webtoon, downloadPath, mergeMethod, openPath) => {
  const mergePath =
    webtoon.type === "manga"
      ? downloadPath +
        "\\Merged\\" +
        fixNameForFolder(webtoon.title) +
        "\\" +
        webtoon.info
      : downloadPath + "\\Merged\\" + fixNameForFolder(webtoon.title);
  mergeImages(webtoon.path, mergePath, mergeMethod);
  if (openPath) {
    window.do.openFolder(mergePath);
  }
};

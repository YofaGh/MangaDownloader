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
  ).then(() => {
    if (openPath) {
      window.do.openFolder(webtoon.path, { activate: true });
    }
  });
};
export const merge = async (webtoon, downloadPath, mergeMethod, openPath) => {
  const mergePath =
    webtoon.type === "manga"
      ? downloadPath +
        "\\Merged\\" +
        fixNameForFolder(webtoon.title) +
        "\\" +
        webtoon.info
      : downloadPath + "\\Merged\\" + fixNameForFolder(webtoon.title);
  await mergeImages(webtoon.path, mergePath, mergeMethod).then(() => {
    if (openPath) {
      window.do.openFolder(mergePath, { activate: true });
    }
  });
};
export const getDate = (datetime) => {
  const date = new Date(datetime);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

export const getDateTime = (datetime) => {
  const date = new Date(datetime);
  return `${date.getFullYear()}/${
    date.getMonth() + 1
  }/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const filterDict = (webtoon, filters) => {
  return Object.keys(webtoon)
    .filter((key) => !filters.includes(key))
    .reduce((obj, key) => {
      return Object.assign(obj, {
        [key]: webtoon[key],
      });
    }, {});
};

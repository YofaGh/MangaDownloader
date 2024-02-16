export const fixNameForFolder = (manga) => {
  return manga.replace(/[\/:*?"><|]+/g, "").replace(/\.*$/, "");
};

export const convert = async (webtoon, openPath, dispatch, sheller) => {
  let pdfName =
    webtoon.type === "manga"
      ? `${fixNameForFolder(webtoon.title)}_${webtoon.info}`
      : `${webtoon.doujin}_${fixNameForFolder(webtoon.title)}`;
  await sheller(["convert", webtoon.path, webtoon.path, pdfName]).then(() => {
    dispatch({
      type: "SUCCESS",
      message:
        webtoon.type === "manga"
          ? `Converted ${webtoon.title} - ${webtoon.info}`
          : `Converted ${webtoon.title}`,
      title: "Successful Request",
    });
    if (openPath) {
      window.do.showItemInFolder(`${webtoon.path}\\${pdfName}.pdf`);
    }
  });
};

export const merge = async (
  webtoon,
  downloadPath,
  mergeMethod,
  openPath,
  dispatch,
  sheller
) => {
  const mergePath =
    webtoon.type === "manga"
      ? downloadPath +
        "\\Merged\\" +
        fixNameForFolder(webtoon.title) +
        "\\" +
        webtoon.info
      : downloadPath + "\\Merged\\" + fixNameForFolder(webtoon.title);
  await sheller(["merge", webtoon.path, mergePath, mergeMethod]).then(() => {
    dispatch({
      type: "SUCCESS",
      message:
        webtoon.type === "manga"
          ? `Merged ${webtoon.title} - ${webtoon.info}`
          : `Merged ${webtoon.title}`,
      title: "Successful Request",
    });
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

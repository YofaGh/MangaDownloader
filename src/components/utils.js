export const fixNameForFolder = (manga) => {
  return manga.replace(/[/:*?"><|]+/g, "").replace(/\.*$/, "");
};

export const convert = async (
  webtoon,
  openPath,
  addNotification,
  invoke,
  openFile
) => {
  let pdfName =
    webtoon.type === "manga"
      ? `${fixNameForFolder(webtoon.title)}_${webtoon.info}.pdf`
      : `${webtoon.doujin}_${fixNameForFolder(webtoon.title)}.pdf`;
  await invoke("convert", {
    pathToSource: webtoon.path,
    pathToDestination: webtoon.path,
    pdfName,
  });
  addNotification(
    webtoon.type === "manga"
      ? `Converted ${webtoon.title} - ${webtoon.info}`
      : `Converted ${webtoon.title}`,
    "SUCCESS"
  );
  if (openPath) {
    openFile(`${webtoon.path}\\${pdfName}`);
  }
};

export const merge = async (
  webtoon,
  download_path,
  mergeMethod,
  openPath,
  addNotification,
  invoke,
  openFolder
) => {
  const mergePath =
    webtoon.type === "manga"
      ? download_path +
        "\\Merged\\" +
        fixNameForFolder(webtoon.title) +
        "\\" +
        webtoon.info
      : download_path + "\\Merged\\" + fixNameForFolder(webtoon.title);
  await invoke("merge", {
    pathToSource: webtoon.path,
    pathToDestination: mergePath,
    mergeMethod,
  });
  addNotification(
    webtoon.type === "manga"
      ? `Merged ${webtoon.title} - ${webtoon.info}`
      : `Merged ${webtoon.title}`,
    "SUCCESS"
  );
  if (openPath) {
    openFolder(mergePath);
  }
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

export const retrieveImage = async (
  imageSrc,
  module,
  setImageSrc,
  invoke,
  defImage
) => {
  try {
    const response = await invoke("retrieve_image", {
      domain: module,
      url: imageSrc,
    });
    setImageSrc(response);
  } catch (error) {
    setImageSrc(defImage);
  }
};

export const chunkArray = (array, size) =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );

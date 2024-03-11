export const fixNameForFolder = (manga) => {
  return manga.replace(/[/:*?"><|]+/g, "").replace(/\.*$/, "");
};

export const convert = async (
  webtoon,
  openPath,
  dispatchSuccess,
  sheller,
  openFile
) => {
  let pdfName =
    webtoon.type === "manga"
      ? `${fixNameForFolder(webtoon.title)}_${webtoon.info}`
      : `${webtoon.doujin}_${fixNameForFolder(webtoon.title)}`;
  await sheller(["convert", webtoon.path, webtoon.path, pdfName]).then(() => {
    dispatchSuccess(
      webtoon.type === "manga"
        ? `Converted ${webtoon.title} - ${webtoon.info}`
        : `Converted ${webtoon.title}`
    );
    if (openPath) {
      openFile(`${webtoon.path}\\${pdfName}.pdf`);
    }
  });
};

export const merge = async (
  webtoon,
  download_path,
  mergeMethod,
  openPath,
  dispatchSuccess,
  sheller,
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
  await sheller(["merge", webtoon.path, mergePath, mergeMethod]).then(() => {
    dispatchSuccess(
      webtoon.type === "manga"
        ? `Merged ${webtoon.title} - ${webtoon.info}`
        : `Merged ${webtoon.title}`
    );
    if (openPath) {
      openFolder(mergePath);
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

export const retrieveImage = async (
  imageSrc,
  module,
  setImageSrc,
  sheller,
  defImage
) => {
  try {
    const response = await sheller(["retrieve_image", module, imageSrc]);
    setImageSrc(response);
  } catch (error) {
    setImageSrc(defImage);
  }
};

export const chunkArray = (array, size) =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
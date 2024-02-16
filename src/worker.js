import { fixNameForFolder } from "./components/utils";
const { execFile } = global.require("child_process");
const fs = global.require("fs");

const sheller = async (shellerPath, args) => {
  return new Promise((resolve, reject) => {
    execFile(shellerPath, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

onmessage = async (e) => {
  if (e.data.download) {
    const { webtoon, downloadPath, shellerPath } = e.data.download;
    let images;
    let save_names;
    let i = 0;
    if (webtoon.type === "manga") {
      const response0 = await sheller(shellerPath, [
        "get_manga_images",
        webtoon.module,
        webtoon.manga,
        webtoon.chapter,
      ]);
      const response = JSON.parse(response0);
      images = response[0];
      save_names = response[1];
    } else if (webtoon.type === "doujin") {
      const response0 = await sheller(shellerPath, [
        "get_doujin_images",
        webtoon.module,
        webtoon.doujin,
      ]);
      const response = JSON.parse(response0);
      images = response[0];
      save_names = response[1];
    }
    const folderName =
      webtoon.type === "manga"
        ? fixNameForFolder(webtoon.title) + "\\" + webtoon.info
        : fixNameForFolder(webtoon.title);
    const dPath = downloadPath + "\\" + folderName;
    await fs.mkdirSync(dPath, { recursive: true }, (err) => {});
    postMessage({ totalImages: { webtoon, total: images.length } });
    const dirls = await fs.readdirSync(dPath);
    const existsImages = dirls.map((inp) => `${dPath}/${inp}`);
    let lastTruncated = null;
    while (i < images.length) {
      const createArrowFunction = (image) => {
        return () => {
          postMessage({ downloading: { webtoon, image: image + 1 } });
          image++;
        };
      };
      let save_path;
      if (save_names) {
        save_path = `${dPath}/${save_names[i]}`;
      } else {
        save_path = `${dPath}/${(i + 1).toString().padStart(3, "0")}.${images[i]
          .split(".")
          .pop()}`;
      }
      if (!existsImages.includes(save_path)) {
        const response = await sheller(shellerPath, [
          "download_image",
          webtoon.module,
          images[i],
          save_path,
        ]);
        const saved_path = JSON.parse(response);
        const notCorrupted = await sheller(shellerPath, [
          "validate_corrupted_image",
          saved_path,
        ]);
        if (!JSON.parse(notCorrupted)) {
          postMessage({ corruptedImage: { webtoon, path: saved_path } });
          i += 1;
          continue;
        }
        const notTruncated = await sheller(shellerPath, [
          "validate_truncated_image",
          saved_path,
        ]);
        if (!JSON.parse(notTruncated) && lastTruncated !== saved_path) {
          lastTruncated = saved_path;
          postMessage({ removeImage: { saved_path } });
          i -= 1;
          continue;
        }
      }
      await new Promise((res) => setTimeout(res, 100, "done sleeping")).then(
        createArrowFunction(i)
      );
      i++;
    }
    postMessage({ done: { webtoon, path: dPath, images: images.length } });
  }
  if (e.data.search) {
    const { keyword, depth, absolute, modules, sleepTime, shellerPath } =
      e.data.search;
    for (const module of modules) {
      postMessage({ searchingModule: { module, keyword } });
      const response = await sheller(shellerPath, [
        "search",
        module,
        keyword,
        sleepTime,
        absolute,
        depth,
      ]);
      const results = JSON.parse(response);
      postMessage({ searchedModule: { module, response: results } });
    }
    postMessage({ doneSearching: { keyword } });
  }
};

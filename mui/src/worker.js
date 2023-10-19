import { get_manga_images, get_doujin_images } from "./api/get_images";
import { download_image } from "./api/download_image";
import { fixNameForFolder } from "./components/utils";
import { search } from "./api/search";

onmessage = async (e) => {
  if (e.data.download) {
    const webtoon = e.data.download.webtoon;
    let images;
    let save_names;
    let path;
    let i = 0;
    if (webtoon.type === "manga") {
      const response = await get_manga_images(
        webtoon.module,
        webtoon.manga,
        webtoon.chapter
      );
      images = response[0];
      save_names = response[1];
      path = `${fixNameForFolder(webtoon.title)}/${webtoon.info}`;
    } else if (webtoon.type === "doujin") {
      const response = await get_doujin_images(webtoon.module, webtoon.doujin);
      images = response[0];
      save_names = response[1];
      path = fixNameForFolder(webtoon.title);
    }
    postMessage({ totalImages: { webtoon, total: images.length } });
    const existsImages = e.data.download.dirls.map((inp) => `${path}/${inp}`);
    while (i < images.length) {
      const createArrowFunction = (image) => {
        return () => {
          postMessage({ downloading: { webtoon, image: image + 1 } });
          image++;
        };
      };
      let save_path;
      if (save_names) {
        save_path = `${path}/${save_names[i]}`;
      } else {
        save_path = `${path}/${(i + 1).toString().padStart(3, "0")}.${images[i]
          .split(".")
          .pop()}`;
      }
      if (!existsImages.includes(save_path)) {
        const saved_path = await download_image(
          webtoon.module,
          images[i],
          `../${save_path}`
        );
      }
      await new Promise((res) => setTimeout(res, 100, "done sleeping")).then(
        createArrowFunction(i)
      );
      i++;
    }
    postMessage({ done: { webtoon, path, images: images.length } });
  }
  if (e.data.search) {
    const { keyword, depth, absolute, modules, sleepTime } = e.data.search;
    for (const module of modules) {
      postMessage({ searchingModule: { module, keyword } });
      const response = await search(module, keyword, depth, absolute, sleepTime);
      postMessage({ searchedModule: { module, response } });
    }
    postMessage({ doneSearching: { keyword } });
  }
};

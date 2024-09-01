import { useState } from "react";
import { MCard, ModuleCheckerModal } from "../components";
import {
  chunkArray,
  getModuleSample,
  getChapters,
  getImages,
  downloadImage,
  searchByKeyword,
  removeFile,
  WebtoonType,
  showHideModal,
} from "../utils";
import { useSettingsStore, useModulesStore } from "../store";

export default function Modules() {
  const { load_covers, data_dir_path } = useSettingsStore(
    (state) => state.settings
  );
  const [moduleToCheck, setModuleToCheck] = useState([]);
  const chunkedModules = chunkArray(
    useModulesStore((state) => state.modules),
    3
  );

  window.addEventListener("click", (event) => {
    event.target === document.getElementById("checkModal") &&
      showHideModal("checkModal", false);
  });

  const checkModule = async (module) => {
    showHideModal("checkModal", true);
    const funcs = [
      "checkChapter",
      "checkImage",
      "checkDownloadImage",
      "checkSearch",
    ];
    for (let i = 0; i < funcs.length; i++) {
      try {
        const element = document.getElementById(funcs[i]);
        element.classList.remove("ch-active");
        element.classList.remove("ch-done");
        element.classList.remove("ch-dead");
      } catch (e) {}
    }
    setModuleToCheck(module);
    const sample = await getModuleSample(module.domain);
    if (module.type === WebtoonType.MANGA) {
      let element = document.getElementById("checkChapter");
      element.classList.add("ch-active");
      let chapters = [];
      try {
        chapters = await getChapters(module.domain, sample.manga);
      } catch (e) {}
      element.classList.remove("ch-active");
      if (chapters) {
        element.classList.add("ch-done");
        element = document.getElementById("checkImage");
        element.classList.add("ch-active");
        let images = [];
        let save_names = [];
        const response = await getImages(
          module.domain,
          sample.manga,
          chapters[0].url
        );
        images = response[0];
        save_names = response[1];
        if (images) {
          element.classList.remove("ch-active");
          element.classList.add("ch-done");
          element = document.getElementById("checkDownloadImage");
          element.classList.add("ch-active");
          let saved_path;
          if (save_names) {
            saved_path = await downloadImage(
              module.domain,
              images[0],
              `${data_dir_path}/${save_names[0]}`
            );
          } else {
            saved_path = await downloadImage(
              module.domain,
              images[0],
              `${data_dir_path}/${module.domain}_test.${
                images[0].split(".").slice(-1)[0]
              }`
            );
          }
          element.classList.remove("ch-active");
          element.classList.add("ch-done");
          await removeFile(saved_path);
        } else {
          element.classList.remove("ch-active");
          element.classList.add("ch-dead");
          element = document.getElementById("checkDownloadImage");
          element.classList.add("ch-dead");
        }
      } else {
        element.classList.remove("ch-remove");
        element.classList.add("ch-dead");
        element = document.getElementById("checkImage");
        element.classList.add("ch-dead");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-dead");
      }
      if (module.searchable) {
        element = document.getElementById("checkSearch");
        element.classList.add("ch-active");
        const results = await searchByKeyword(
          module.domain,
          sample.keyword || "a",
          0.1,
          false,
          2
        );
        element.classList.remove("ch-active");
        if (results) {
          element.classList.add("ch-done");
        } else {
          element.classList.add("ch-dead");
        }
      }
    } else if (module.type === WebtoonType.DOUJIN) {
      let element = document.getElementById("checkImage");
      element.classList.add("ch-active");
      let images = [];
      let save_names = [];
      const response = await getImages(module.domain, sample.code, "");
      images = response[0];
      save_names = response[1];
      if (images) {
        element.classList.remove("ch-active");
        element.classList.add("ch-done");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-active");
        let saved_path;
        if (save_names) {
          saved_path = await downloadImage(
            module.domain,
            images[0],
            `${data_dir_path}/${save_names[0]}`
          );
        } else {
          saved_path = await downloadImage(
            module.domain,
            images[0],
            `${data_dir_path}/${module.domain}_test.${
              images[0].split(".").slice(-1)[0]
            }`
          );
        }
        element.classList.remove("ch-active");
        element.classList.add("ch-done");
        await removeFile(saved_path);
      } else {
        element.classList.remove("ch-active");
        element.classList.add("ch-dead");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-dead");
      }
      if (module.searchable) {
        element = document.getElementById("checkSearch");
        element.classList.add("ch-active");
        const results = await searchByKeyword(
          module.domain,
          sample.keyword || "a",
          0.1,
          false,
          2
        );
        element.classList.remove("ch-active");
        if (results) {
          element.classList.add("ch-done");
        } else {
          element.classList.add("ch-dead");
        }
      }
    }
  };

  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Modules</h1>
        </div>
      </div>
      <div className="card-row-container">
        {chunkedModules.map((chunk, index) => (
          <div key={index} className="card-row">
            {chunk.map((module) => (
              <div key={module.domain} className="card-wrapper">
                <MCard
                  module={module}
                  load_covers={load_covers}
                  checkModule={checkModule}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <ModuleCheckerModal module={moduleToCheck} checkModule={checkModule} />
    </div>
  );
}

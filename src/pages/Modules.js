import { useState, useEffect } from "react";
import { MCard, chunkArray, ModuleChecker } from "../components";
import { useSettings } from "../Provider";
import { invoke } from "@tauri-apps/api/core";
import { remove } from "@tauri-apps/plugin-fs";

export default function Modules() {
  const [modules, setModules] = useState([]);
  const { load_covers, data_dir_path } = useSettings();
  const [moduleToCheck, setModuleToCheck] = useState([]);
  const chunkedModules = chunkArray(modules, 3);

  useEffect(() => {
    const fetchModules = async () => {
      invoke("get_modules").then((response) => {
        setModules(response);
      });
    };
    fetchModules();
  });

  const showHideModal = (isShow) => {
    const modal = document.getElementById("checkModal");
    modal.style.display = isShow ? "block" : "none";
  };

  window.addEventListener("click", (event) => {
    event.target === document.getElementById("checkModal") &&
      showHideModal(false);
  });

  const checkModule = async (module) => {
    showHideModal(true);
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
    const sample = await invoke("get_module_sample", { domain: module.domain });
    if (module.type === "Manga") {
      let element = document.getElementById("checkChapter");
      element.classList.add("ch-active");
      let chapters = [];
      try {
        chapters = await invoke("get_chapters", {
          domain: module.domain,
          url: sample.manga,
        });
      } catch (e) {}
      element.classList.remove("ch-active");
      if (chapters) {
        element.classList.add("ch-done");
        element = document.getElementById("checkImage");
        element.classList.add("ch-active");
        let images = [];
        let save_names = [];
        const response = await invoke("get_images", {
          domain: module.domain,
          manga: sample.manga,
          chapter: chapters[0].url,
        });
        images = response[0];
        save_names = response[1];
        if (images) {
          element.classList.remove("ch-active");
          element.classList.add("ch-done");
          element = document.getElementById("checkDownloadImage");
          element.classList.add("ch-active");
          let saved_path;
          if (save_names) {
            saved_path = await invoke("download_image", {
              domain: module.domain,
              url: images[0],
              imageName: `${data_dir_path}/${save_names[0]}`,
            });
          } else {
            saved_path = await invoke("download_image", {
              domain: module.domain,
              url: images[0],
              imageName: `${data_dir_path}/${module.domain}_test.${
                images[0].split(".").slice(-1)[0]
              }`,
            });
          }
          element.classList.remove("ch-active");
          element.classList.add("ch-done");
          await remove(saved_path);
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
        const results = await invoke("search_keyword_one", {
          module: module.domain,
          keyword: sample.keyword ? sample.keyword : "a",
          sleepTime: 0.1,
          absolute: false,
          depth: 2,
        });
        element.classList.remove("ch-active");
        if (results) {
          element.classList.add("ch-done");
        } else {
          element.classList.add("ch-dead");
        }
      }
    } else if (module.type === "Doujin") {
      let element = document.getElementById("checkImage");
      element.classList.add("ch-active");
      let images = [];
      let save_names = [];
      const response = await invoke("get_images", {
        domain: module.domain,
        manga: sample.doujin,
        chapter: "",
      });
      images = response[0];
      save_names = response[1];
      if (images) {
        element.classList.remove("ch-active");
        element.classList.add("ch-done");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-active");
        let saved_path;
        if (save_names) {
          saved_path = await invoke("download_image", {
            domain: module.domain,
            url: images[0],
            imageName: `${data_dir_path}/${save_names[0]}`,
          });
        } else {
          saved_path = await invoke("download_image", {
            domain: module.domain,
            url: images[0],
            imageName: `${data_dir_path}/${module.domain}_test.${
              images[0].split(".").slice(-1)[0]
            }`,
          });
        }
        element.classList.remove("ch-active");
        element.classList.add("ch-done");
        await remove(saved_path);
      } else {
        element.classList.remove("ch-active");
        element.classList.add("ch-dead");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-dead");
      }
      if (module.searchable) {
        element = document.getElementById("checkSearch");
        element.classList.add("ch-active");
        const results = await invoke("search_keyword_one", {
          module: module.domain,
          keyword: sample.keyword ? sample.keyword : "a",
          sleepTime: 0.1,
          absolute: false,
          depth: 2,
        });
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
      <ModuleChecker
        module={moduleToCheck}
        showHideModal={showHideModal}
        checkModule={checkModule}
      />
    </div>
  );
}

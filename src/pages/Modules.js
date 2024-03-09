import { useState, useEffect } from "react";
import { MCard, ModuleChecker } from "../components";
import { useSheller } from "../ShellerProvider";
import { BaseDirectory, removeFile } from "@tauri-apps/api/fs";
import { appDataDir } from "@tauri-apps/api/path";

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [moduleToCheck, setModuleToCheck] = useState([]);
  const sheller = useSheller();

  const removeF = async (path) => {
    await removeFile(path, { dir: BaseDirectory.AppLocalData });
  };

  useEffect(() => {
    const fetchModules = async () => {
      const response = await sheller(["get_modules"]);
      setModules(response);
    };

    fetchModules();
  }, [sheller]);

  const showHideModal = (isShow) => {
    const modal = document.getElementById("checkModal");
    modal.style.display = isShow ? "block" : "none";
  };

  window.addEventListener("click", (event) => {
    event.target === document.getElementById("checkModal") &&
      showHideModal(false);
  });

  const checkModule = async (module) => {
    const dataDir = await appDataDir();
    showHideModal(true);
    const funcs = [
      "checkChapter",
      "checkImage",
      "checkDownloadImage",
      "checkSearch",
      "checkTitle",
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
    const sample = await sheller(["get_sample", module.domain]);
    if (module.type === "Manga") {
      let element = document.getElementById("checkChapter");
      element.classList.add("ch-active");
      let chapters = [];
      try {
        chapters = await sheller(["get_chapters", module.domain, sample.manga]);
      } catch (e) {}
      element.classList.remove("ch-active");
      if (chapters) {
        element.classList.add("ch-done");
        element = document.getElementById("checkImage");
        element.classList.add("ch-active");
        let images = [];
        let save_names = [];
        const response = await sheller([
          "get_manga_images",
          module.domain,
          sample.manga,
          chapters[0].url,
        ]);
        images = response[0];
        save_names = response[1];
        if (images) {
          element.classList.remove("ch-active");
          element.classList.add("ch-done");
          element = document.getElementById("checkDownloadImage");
          element.classList.add("ch-active");
          let saved_path;
          if (save_names) {
            saved_path = await sheller([
              "download_image",
              module.domain,
              images[0],
              `${dataDir}/${save_names[0]}`,
            ]);
          } else {
            saved_path = await sheller([
              "download_image",
              module.domain,
              images[0],
              `${dataDir}/${module.domain}_test.${
                images[0].split(".").slice(-1)[0]
              }`,
            ]);
          }
          const notTruncated = await sheller([
            "validate_truncated_image",
            saved_path,
          ]);
          const notCorrupted = await sheller([
            "validate_corrupted_image",
            saved_path,
          ]);
          element.classList.remove("ch-active");
          if (notTruncated && notCorrupted) {
            element.classList.add("ch-done");
            removeF(saved_path);
          } else {
            element.classList.add("ch-dead");
          }
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
        const results = await sheller([
          "search",
          module.domain,
          sample.keyword ? sample.keyword : "a",
          0.1,
          false,
          2,
        ]);
        element.classList.remove("ch-active");
        if (results) {
          element.classList.add("ch-done");
        } else {
          element.classList.add("ch-dead");
        }
      }
    } else if (module.type === "Doujin") {
      let element = document.getElementById("checkTitle");
      element.classList.add("ch-active");
      let title = "";
      try {
        title = await sheller([
          "get_doujin_title",
          module.domain,
          String(sample.doujin),
        ]);
      } catch (e) {}
      element.classList.remove("ch-active");
      if (title) {
        element.classList.add("ch-done");
      } else {
        element.classList.add("ch-dead");
      }
      element = document.getElementById("checkImage");
      element.classList.add("ch-active");
      let images = [];
      let save_names = [];
      const response = await sheller([
        "get_doujin_images",
        module.domain,
        String(sample.doujin),
      ]);
      images = response[0];
      save_names = response[1];
      if (images) {
        element.classList.remove("ch-active");
        element.classList.add("ch-done");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-active");
        let saved_path;
        if (save_names) {
          saved_path = await sheller([
            "download_image",
            module.domain,
            images[0],
            `${dataDir}/${save_names[0]}`,
          ]);
        } else {
          saved_path = await sheller([
            "download_image",
            module.domain,
            images[0],
            `${dataDir}/${module.domain}_test.${
              images[0].split(".").slice(-1)[0]
            }`,
          ]);
        }
        const notTruncated = await sheller([
          "validate_truncated_image",
          saved_path,
        ]);
        const notCorrupted = await sheller([
          "validate_corrupted_image",
          saved_path,
        ]);
        element.classList.remove("ch-active");
        if (notTruncated && notCorrupted) {
          element.classList.add("ch-done");
          removeF(saved_path);
        } else {
          element.classList.add("ch-dead");
        }
      } else {
        element.classList.remove("ch-active");
        element.classList.add("ch-dead");
        element = document.getElementById("checkDownloadImage");
        element.classList.add("ch-dead");
      }
      if (module.searchable) {
        element = document.getElementById("checkSearch");
        element.classList.add("ch-active");
        const results = await sheller([
          "search",
          module.domain,
          sample.keyword ? sample.keyword : "a",
          0.1,
          false,
          2,
        ]);
        element.classList.remove("ch-active");
        if (results) {
          element.classList.add("ch-done");
        } else {
          element.classList.add("ch-dead");
        }
      }
    }
  };

  const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  const chunkedModules = chunkArray(modules, 3);

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
                <MCard module={module} checkModule={checkModule} />
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

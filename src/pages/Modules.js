import { useEffect, useState } from "react";
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
  const [stepStatuses, setStepStatuses] = useState([]);
  const chunkedModules = chunkArray(
    useModulesStore((state) => state.modules),
    3
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target === document.getElementById("checkModal"))
        showHideModal("checkModal", false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const updateStepStatus = (stepIndex, status) => {
    setStepStatuses((prev) => {
      const newStatuses = [...prev];
      newStatuses[stepIndex] = status;
      return newStatuses;
    });
  };

  const checkModule = async (module) => {
    showHideModal("checkModal", true);
    setModuleToCheck(module);
    const sample = await getModuleSample(module.domain);
    let circle = 0;
    let chapter = "";
    let images = [];
    let save_names = false;
    let image = "";
    let path = "";
    let saved_path = "";
    let stat = "dead";
    if (module.type === WebtoonType.MANGA) {
      setStepStatuses(new Array(4).fill(""));
      updateStepStatus(circle, "ch-active");
      let chapters = await getChapters(module.domain, sample.manga);
      if (chapters.length > 0) {
        chapter = chapters[0].url;
        stat = "done";
      } else chapter = "$";
      updateStepStatus(circle, `ch-${stat}`);
      circle++;
    } else setStepStatuses(new Array(3).fill(""));
    updateStepStatus(circle, "ch-active");
    stat = "dead";
    if (chapter !== "$") {
      [images, save_names] = await getImages(
        module.domain,
        sample.manga || sample.code,
        chapter
      );
      if (images.length > 0) {
        stat = "done";
        image = images[0];
        path = Array.isArray(save_names)
          ? `${data_dir_path}/${save_names[0]}`
          : `${data_dir_path}/${module.domain}_test.${
              images[0].split(".").slice(-1)[0]
            }`;
      }
    }
    updateStepStatus(circle, `ch-${stat}`);
    circle++;
    updateStepStatus(circle, "ch-active");
    stat = "dead";
    if (image) saved_path = await downloadImage(module.domain, image, path);
    if (saved_path) {
      stat = "done";
      await removeFile(saved_path);
    }
    updateStepStatus(circle, `ch-${stat}`);
    stat = "dead";
    circle++;
    if (module.searchable) {
      updateStepStatus(circle, "ch-active");
      const results = await searchByKeyword(
        module.domain,
        sample.keyword || "a",
        0.1,
        2,
        false
      );
      if (results.length > 0) stat = "done";
    }
    updateStepStatus(circle, `ch-${stat}`);
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
      <ModuleCheckerModal
        module={moduleToCheck}
        checkModule={checkModule}
        stepStatuses={stepStatuses}
      />
    </div>
  );
}

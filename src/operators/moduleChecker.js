import { useSettingsStore } from "../store";
import {
  getImages,
  removeFile,
  WebtoonType,
  getChapters,
  showHideModal,
  downloadImage,
  searchByKeyword,
  getModuleSample,
} from "../utils";

export default async function moduleChecker(module, setStepStatuses) {
  const { data_dir_path } = useSettingsStore.getState().settings;
  const updateStepStatus = (stepIndex, status) => {
    setStepStatuses((prev) => {
      const newStatuses = [...prev];
      newStatuses[stepIndex] = status;
      return newStatuses;
    });
  };
  showHideModal("checkModal", true);
  const sample = await getModuleSample(module.domain);
  let circle = 0,
    images = [],
    stat = "dead",
    save_names = false,
    chapter,
    image,
    path,
    saved_path;
  chapter = image = path = saved_path = "";
  if (module.type === WebtoonType.MANGA) {
    setStepStatuses(new Array(4).fill(""));
    updateStepStatus(circle, "active");
    let chapters = await getChapters(module.domain, sample.manga);
    if (chapters.length > 0) {
      chapter = chapters[0].url;
      stat = "done";
    } else chapter = "$";
    updateStepStatus(circle, stat);
    circle++;
  } else setStepStatuses(new Array(3).fill(""));
  updateStepStatus(circle, "active");
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
  updateStepStatus(circle, stat);
  circle++;
  updateStepStatus(circle, "active");
  stat = "dead";
  if (image) saved_path = await downloadImage(module.domain, image, path);
  if (saved_path) {
    stat = "done";
    await removeFile(saved_path);
  }
  updateStepStatus(circle, stat);
  stat = "dead";
  circle++;
  if (module.searchable) {
    updateStepStatus(circle, "active");
    const results = await searchByKeyword(
      module.domain,
      sample.keyword || "a",
      0.1,
      2,
      false
    );
    if (results.length > 0) stat = "done";
  }
  updateStepStatus(circle, stat);
}

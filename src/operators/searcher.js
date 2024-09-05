import { searchByKeyword } from "../utils";
import { useModulesStore, useSearchStore, useSettingsStore } from "../store";

export default async function searcher() {
  const {
    searchKeyword,
    searchDepth,
    searchAbsolute,
    setSearching,
    doneSearching,
    setSearchKeyword,
    addSearchResult,
    setSelectedSearchModules,
    clearSearch,
    searchModuleTypes,
  } = useSearchStore.getState();
  clearSearch();
  const selectedSearchModules = useModulesStore
    .getState()
    .modules.filter(
      (module) =>
        searchModuleTypes.some(
          (type) => type.name === module.type && type.selected
        ) &&
        module.searchable &&
        module.selected
    )
    .map((item) => item.domain);
  setSearchKeyword(searchKeyword);
  setSelectedSearchModules(selectedSearchModules);
  const sleepTime = useSettingsStore.getState().settings.sleep_time;
  for (const module of selectedSearchModules) {
    if (useSearchStore.getState().stopRequested) return;
    setSearching(module);
    addSearchResult(
      await searchByKeyword(
        module,
        searchKeyword,
        sleepTime,
        searchDepth,
        searchAbsolute
      )
    );
  }
  doneSearching();
};

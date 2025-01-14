import { searchByKeyword } from "../utils";
import { useModulesStore, useSearchStore, useSettingsStore } from "../store";

export default async function searcher() {
  const {
    clearSearch,
    searchDepth,
    setSearching,
    doneSearching,
    searchKeyword,
    searchAbsolute,
    addSearchResult,
    searchModuleTypes,
    setSelectedSearchModules,
  } = useSearchStore.getState();
  clearSearch();
  const selectedSearchModules = useModulesStore
    .getState()
    .modules.filter(
      (module) =>
        searchModuleTypes.some(
          (type) => type.name === module.type && type.selected
        ) &&
        module.is_searchable &&
        module.selected
    )
    .map((item) => item.domain);
  setSelectedSearchModules(selectedSearchModules);
  const sleepTime = useSettingsStore.getState().settings.sleep_time;
  for (const module of selectedSearchModules) {
    if (useSearchStore.getState().stopRequested) return;
    setSearching(module);
    const result = await searchByKeyword(
      module,
      searchKeyword,
      sleepTime,
      searchDepth,
      searchAbsolute
    );
    addSearchResult(result);
  }
  doneSearching();
}

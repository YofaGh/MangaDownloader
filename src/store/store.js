import { create } from "zustand";
import { v4 } from "uuid";

export const useSearchStore = create((set) => ({
  searchStatus: { init: true },
  searchAbsolute: false,
  stopRequested: false,
  searchDepth: 0,
  searchKeyword: "",
  searchResults: [],
  selectedSearchModules: [],
  searchModuleTypes: [
    { name: "Manga", selected: true },
    { name: "Doujin", selected: true },
  ],

  setSearching: (module) => set({ searchStatus: { searching: module } }),
  doneSearching: () =>
    set({ searchStatus: { searched: true }, stopRequested: false }),

  setSearchKeyword: (newSearchKeyword) =>
    set({ searchKeyword: newSearchKeyword }),

  addSearchResult: (newResult) =>
    set((state) => ({
      searchResults: [...state.searchResults, ...newResult],
    })),

  setSelectedSearchModules: (newSelectedSearchModules) =>
    set({ selectedSearchModules: newSelectedSearchModules }),

  clearSearch: () =>
    set({
      selectedSearchModules: [],
      searchResults: [],
      searchStatus: { init: true },
    }),
  updateSearchModuleTypeByIndex: (index, selected) =>
    set((state) => ({
      searchModuleTypes: state.searchModuleTypes.map((moduleType, i) =>
        i === index ? { ...moduleType, selected } : moduleType
      ),
    })),
  setSearchAbsolute: (newAbsolute) => set({ searchAbsolute: newAbsolute }),
  setSearchDepth: (newDepth) => set({ searchDepth: newDepth }),
  setStopRequested: (value) => set({ stopRequested: value }),
}));

export const useDownloadingStore = create((set) => ({
  downloading: null,
  stopRequested: false,
  setDownloading: (newVal) => set({ downloading: newVal }),
  clearDownloading: () => set({ downloading: null }),
  setStopRequested: (newVal) => set({ stopRequested: newVal }),
}));

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((note) => note.id !== id),
    })),
  notifySuccess: (message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: v4(), type: "success", message },
      ],
    })),
  notifyError: (message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: v4(), type: "error", message },
      ],
    })),
}));

export const useDownloadTabStore = create((set) => ({
  downloadTab: "queue",
  setDownloadTab: (newVal) => set({ downloadTab: newVal }),
}));

export const useModulesStore = create((set) => ({
  modules: [],
  setModules: (newVal) => set({ modules: newVal }),
  updateModuleSelected: (domain, selected) =>
    set((state) => ({
      modules: state.modules.map((module) =>
        module.domain === domain ? { ...module, selected } : module
      ),
    })),
  updateModulesSelected: (selected) =>
    set((state) => ({
      modules: state.modules.map((module) => ({ ...module, selected })),
    })),
}));

export const useSauceStore = create((set) => ({
  sauceStatus: null,
  sauceUrl: "",
  sauceResults: [],
  saucers: [],

  setSauceStatus: (status) => set({ sauceStatus: status }),
  setSauceUrl: (newUrl) => set({ sauceUrl: newUrl }),
  addSauceResult: (newResult) =>
    set((state) => ({
      sauceResults: [...state.sauceResults, ...newResult],
    })),
  setSaucers: (newSaucers) => set({ saucers: newSaucers }),
  clearSauce: () =>
    set({
      sauceStatus: null,
      sauceResults: [],
    }),
}));

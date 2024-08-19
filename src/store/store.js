import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export const useSearchStore = create((set) => ({
  searchStatus: {
    status: null,
    searching: null,
  },
  searchKeyword: "",
  searchResults: [],
  selectedSearchModules: [],

  setSearching: (module) =>
    set({
      searchStatus: {
        status: "searching",
        searching: { module },
      },
    }),
  doneSearching: () =>
    set({
      searchStatus: {
        status: "searched",
        searching: null,
      },
    }),

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
      searchKeyword: "",
      searchStatus: {
        status: null,
        searching: null,
      },
    }),
}));

export const useDownloadingStore = create((set) => ({
  downloading: null,
  setDownloading: (newVal) => set({ downloading: newVal }),
  clearDownloading: () => set({ downloading: null }),
}));

export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (message, type) => {
    set((state) => ({
      notifications: [...state.notifications, { id: uuidv4(), type, message }],
    }));
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((note) => note.id !== id),
    }));
  },
}));

export const useDownloadTabStore = create((set) => ({
  downloadTab: "queue",
  setDownloadTab: (newVal) => set({ downloadTab: newVal }),
}));

export const useInitDownloadStore = create((set) => ({
  initDownload: 0,
  increaseInitDownload: () =>
    set((state) => ({ initDownload: state.initDownload + 1 })),
}));

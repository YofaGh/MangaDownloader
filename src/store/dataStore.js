import { create } from "zustand";

export const useSettingsStore = create((set) => ({
  settings: null,

  updateSettings: (newData) =>
    set((state) => ({
      settings: { ...state.settings, ...newData },
    })),
}));

export const useDownloadedStore = create((set) => ({
  downloaded: [],

  setDownloaded: (newDownloaded) => set({ downloaded: newDownloaded }),
  addToDownloaded: (newItem) =>
    set((state) => ({
      downloaded: [newItem, ...state.downloaded],
    })),
  removeFromDownloaded: (id) =>
    set((state) => ({
      downloaded: state.downloaded.filter((entry) => entry.id !== id),
    })),
  removeAllDownloaded: () => set({ downloaded: [] }),
}));

export const useQueueStore = create((set) => ({
  queue: [],

  setQueue: (newQueue) => set({ queue: newQueue }),
  addToQueue: (newData) =>
    set((state) =>
      state.queue.find((item) => item.id === newData.id)
        ? {
            queue: state.queue.map((item) =>
              item.id === newData.id ? newData : item
            ),
          }
        : { queue: [...state.queue, newData] }
    ),
  addToQueueBulk: (newItems) =>
    set((state) => ({
      queue: newItems.reduce((prevQueue, item) => {
        const existingItem = prevQueue.find((i) => i.id === item.id);
        if (existingItem) {
          return prevQueue.map((i) => (i.id === item.id ? item : i));
        }
        return [...prevQueue, item];
      }, state.queue),
    })),
  deleteImagesAndTotalFromQueue: () =>
    set((state) => ({
      queue: state.queue.map(({ image, total, ...rest }) => rest),
    })),
  deleteImagesAndTotalFromWebtoon: (id) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? (({ image, total, ...rest }) => rest)(item) : item
      ),
    })),
  updateItemInQueue: (id, chn) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, ...chn } : item
      ),
    })),
  updateAllItemsInQueue: (chn) =>
    set((state) => ({
      queue: state.queue.map((item) => ({
        ...item,
        ...chn,
      })),
    })),
  reOrderQueue: (newQueue) =>
    set((state) => ({
      queue: newQueue.map((nItem) =>
        state.queue.find((item) => item.id === nItem.id)
      ),
    })),
  removeFromQueue: (id) =>
    set((state) => ({
      queue: state.queue.filter((entry) => entry.id !== id),
    })),
  removeAllFromQueue: () => set({ queue: [] }),
}));

export const useFavoritesStore = create((set) => ({
  favorites: [],

  setFavorites: (newFavorites) => set({ favorites: newFavorites }),
  addToFavorites: (newData) =>
    set((state) => ({
      favorites: [...state.favorites, newData],
    })),
  removeFromFavorites: (id) =>
    set((state) => ({
      favorites: state.favorites.filter((entry) => entry.id !== id),
    })),
}));

export const useLibraryStore = create((set) => ({
  library: [],

  setLibrary: (newLibrary) => set({ library: newLibrary }),
  addToLibrary: (newData) =>
    set((state) => ({
      library: [...state.library, newData],
    })),
  removeFromLibrary: (id) =>
    set((state) => ({
      library: state.library.filter((entry) => entry.id !== id),
    })),
  updateItemInLibrary: (id, chn) =>
    set((state) => ({
      library: state.library.map((entry) =>
        entry.id === id ? { ...entry, ...chn } : entry
      ),
    })),
}));

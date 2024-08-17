import { create } from "zustand";

export const useQueueMessagesStore = create((set) => ({
  queueMessages: [],
  addQueueMessage: (message) =>
    set((state) => ({ queueMessages: [...state.queueMessages, message] })),
}));

export const useDownloadedMessagesStore = create((set) => ({
  downloadedMessages: [],
  addDownloadedMessage: (message) =>
    set((state) => ({
      downloadedMessages: [...state.downloadedMessages, message],
    })),
}));

export const useLibraryMessagesStore = create((set) => ({
  libraryMessages: [],
  addLibraryMessage: (message) =>
    set((state) => ({ libraryMessages: [...state.libraryMessages, message] })),
}));
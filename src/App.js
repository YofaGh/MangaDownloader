import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import {
  Modules,
  Library,
  Search,
  HomePage,
  Webtoon,
  Module,
  Download,
  Favorites,
  Saucer,
  Settings,
  About,
} from "./pages";
import {
  TopBar,
  PushButton,
  fixNameForFolder,
  convert,
  merge,
} from "./components";
import {
  useSheller,
  useSetSettings,
  useSettings,
  useSuccessNotification,
} from "./Provider";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/dialog";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";

export default function App() {
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const [queue, setQueue] = useState([]);
  const [queueMessages, setQueueMessages] = useState([]);
  const [downloadedMessages, setDownloadedMessages] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [downloaded, setDownloaded] = useState([]);
  const [searchingStatus, setSearchingStatus] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [libraryMessages, setLibraryMessages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedModulesForSearch, setSelectedModulesForSearch] = useState([]);
  const dispatchSuccess = useSuccessNotification();
  const sheller = useSheller();

  const readFile = async (file, setter) => {
    const dataDirPath = await appDataDir();
    const contents = await invoke("read_file", {
      path: `${dataDirPath}/${file}`,
    });
    const data = JSON.parse(contents);
    const transformedData =
      file === "library.json"
        ? Object.entries(data).map(([title, details]) => ({
            title,
            status: details.include,
            domain: details.domain,
            url: details.url,
            cover: details.cover,
            last_downloaded_chapter: details.last_downloaded_chapter,
          }))
        : data;
    setter(transformedData);
  };

  const writeFile = async (fileName, data) => {
    if (data) {
      if (fileName === "library.json") {
        data = data.reduce(
          (
            acc,
            { title, status, domain, url, cover, last_downloaded_chapter }
          ) => {
            acc[title] = {
              include: status,
              domain,
              url,
              cover,
              last_downloaded_chapter,
            };
            return acc;
          },
          {}
        );
      }
      let dataDirPath = await appDataDir();
      await invoke("write_file", {
        path: `${dataDirPath}/${fileName}`,
        data: JSON.stringify(data, null, 2),
      });
    }
  };

  const removeDirectory = async (path, recursive) => {
    await invoke("remove_directory", { path, recursive });
  };

  const stopWorker = async (command) => {
    await invoke(command);
  };

  useEffect(() => {
    readFile("settings.json", setSettings);
    readFile("queue.json", setQueue);
    readFile("downloaded.json", setDownloaded);
    readFile("favorites.json", setFavorites);
    readFile("library.json", setLibrary);
  }, []);

  useEffect(() => {
    if (settings) {
      if (!settings.download_path) {
        const modal = document.getElementById("browse-modal");
        modal.style.display = "block";
      } else {
        startDownloading();
      }
    }
  }, [settings]);

  useEffect(() => {
    while (queueMessages.length > 0) {
      const message = queueMessages.shift();
      if (message.setWebtoonStatus) {
        const updatedList = queue.map((item) => {
          if (item.id === message.setWebtoonStatus.webtoon.id) {
            item.status = message.setWebtoonStatus.status;
          }
          return item;
        });
        if (
          downloading &&
          message.setWebtoonStatus.webtoon.id === downloading.id &&
          (message.setWebtoonStatus.status === "Paused" ||
            message.setWebtoonStatus.status === "Not Started")
        ) {
          stopWorker("stop_download");
          setDownloading(null);
        }
        if (message.setWebtoonStatus.status === "Not Started") {
          let indexOfTodo = updatedList.findIndex(
            (item) => item.id === message.setWebtoonStatus.webtoon.id
          );
          delete updatedList[indexOfTodo].downloading;
          delete updatedList[indexOfTodo].totalImages;
          let folderName =
            message.setWebtoonStatus.webtoon.type === "manga"
              ? `${fixNameForFolder(message.setWebtoonStatus.webtoon.title)}/${
                  message.setWebtoonStatus.webtoon.info
                }`
              : fixNameForFolder(message.setWebtoonStatus.webtoon.title);
          removeDirectory(`${settings.download_path}/${folderName}`, true);
          if (message.setWebtoonStatus.webtoon.type === "manga") {
            removeDirectory(
              `${settings.download_path}/${fixNameForFolder(
                message.setWebtoonStatus.webtoon.title
              )}`,
              false
            );
          }
        }
        setQueue(updatedList);
        if (message.setWebtoonStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.setAllWebtoonsStatus) {
        let updatedList = queue.map((item) => {
          if (message.setAllWebtoonsStatus.status === "Paused") {
            if (item.downloading) {
              item.status = "Paused";
            }
          } else {
            item.status = message.setAllWebtoonsStatus.status;
          }
          return item;
        });
        if (
          (message.setAllWebtoonsStatus.status === "Paused" ||
            message.setAllWebtoonsStatus.status === "Not Started") &&
          downloading
        ) {
          stopWorker("stop_download");
          setDownloading(null);
        }
        if (message.setAllWebtoonsStatus.status === "Not Started") {
          for (let webtoon of updatedList) {
            delete webtoon.downloading;
            delete webtoon.totalImages;
          }
          for (const webtoon of queue) {
            let folderName =
              webtoon.type === "manga"
                ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
                : fixNameForFolder(webtoon.title);
            removeDirectory(`${settings.download_path}/${folderName}`, true);
            if (webtoon.type === "manga") {
              removeDirectory(
                `${settings.download_path}/${fixNameForFolder(webtoon.title)}`,
                false
              );
            }
          }
        }
        setQueue(updatedList);
        if (message.setAllWebtoonsStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.done) {
        setDownloading(null);
        let webtoon = queue.find((item) => item.id === message.done.id);
        setQueue((prevQueue) =>
          prevQueue.filter((item) => item.id !== message.done.id)
        );
        if (webtoon.in_library) {
          addLibraryMessage({
            updateWebtoon: {
              domain: webtoon.module,
              url: webtoon.manga,
              last_downloaded_chapter: {
                name: webtoon.info,
                url: webtoon.chapter,
              },
            },
          });
        }
        webtoon.images = webtoon.totalImages;
        webtoon.path = message.done.download_path;
        delete webtoon.status;
        delete webtoon.in_library;
        delete webtoon.downloading;
        delete webtoon.totalImages;
        addDownloadedMessage({ addWebtoon: { webtoon } });
        dispatchSuccess(
          webtoon.type === "manga"
            ? `Downloaded ${webtoon.title} - ${webtoon.info}`
            : `Downloaded ${webtoon.title}`
        );
        if (settings.auto_merge) {
          merge(
            webtoon,
            settings.download_path,
            settings.merge_method,
            false,
            dispatchSuccess,
            sheller,
            null
          );
        }
        if (settings.auto_convert) {
          convert(webtoon, false, dispatchSuccess, sheller, null);
        }
      }
      if (message.removeWebtoon) {
        setQueue((prevQueue) =>
          prevQueue.filter(
            (item) => item.id !== message.removeWebtoon.webtoon.id
          )
        );
        dispatchSuccess(
          message.removeWebtoon.webtoon.type === "manga"
            ? `Removed ${message.removeWebtoon.webtoon.title} - ${message.removeWebtoon.webtoon.info} from queue`
            : `Removed ${message.removeWebtoon.webtoon.title} from queue`
        );
        if (
          downloading &&
          message.removeWebtoon.webtoon.id === downloading.id
        ) {
          stopWorker("stop_download");
          setDownloading(null);
        }
        let folderName =
          message.removeWebtoon.webtoon.type === "manga"
            ? `${fixNameForFolder(message.removeWebtoon.webtoon.title)}/${
                message.removeWebtoon.webtoon.info
              }`
            : fixNameForFolder(message.removeWebtoon.webtoon.title);
        removeDirectory(`${settings.download_path}/${folderName}`, true);
      }
      if (message.addWebtoon) {
        if (!queue.find((item) => item.id === message.addWebtoon.webtoon.id)) {
          setQueue((queue) => {
            let data = [...queue];
            data.push(message.addWebtoon.webtoon);
            return data;
          });
          dispatchSuccess(
            message.addWebtoon.webtoon.type === "manga"
              ? `Added ${message.addWebtoon.webtoon.title} - ${message.addWebtoon.webtoon.info} to queue`
              : `Added ${message.addWebtoon.webtoon.title} to queue`
          );
        } else {
          setQueue((queue) => {
            let data = [...queue];
            let indexOfTodo = data.findIndex(
              (item) => item.id === message.addWebtoon.webtoon.id
            );
            data[indexOfTodo] = message.addWebtoon.webtoon;
            return data;
          });
          dispatchSuccess(
            message.addWebtoon.webtoon.type === "manga"
              ? `Updated ${message.addWebtoon.webtoon.title} - ${message.addWebtoon.webtoon.info} in queue`
              : `Updated ${message.addWebtoon.webtoon.title} in queue`
          );
        }
      }
      if (message.downloading) {
        setQueue((queue) => {
          let data = [...queue];
          let indexOfTodo = data.findIndex(
            (item) => item.id === message.downloading.id
          );
          data[indexOfTodo] = {
            ...data[indexOfTodo],
            downloading: message.downloading.image,
          };
          return data;
        });
      }
      if (message.totalImages) {
        setQueue((queue) => {
          let data = [...queue];
          let indexOfTodo = data.findIndex(
            (item) => item.id === message.totalImages.id
          );
          data[indexOfTodo] = {
            ...data[indexOfTodo],
            totalImages: message.totalImages.total,
          };
          return data;
        });
      }
      if (message.reOrderQueue) {
        setQueue((prevQueue) => {
          return message.reOrderQueue.order.map((webtoon) =>
            prevQueue.find((item) => item.id === webtoon)
          );
        });
      }
    }
  }, [queueMessages, queue, downloading]);

  useEffect(() => {
    while (downloadedMessages.length > 0) {
      const message = downloadedMessages.shift();
      if (message.addWebtoon) {
        setDownloaded((downloaded) => [
          message.addWebtoon.webtoon,
          ...downloaded,
        ]);
      }
      if (message.removeWebtoon) {
        setDownloaded((prevDownloaded) =>
          prevDownloaded.filter(
            (_, index) => index !== message.removeWebtoon.index
          )
        );
      }
      if (message.removeAllWebtoons) {
        setDownloaded([]);
      }
    }
  }, [downloadedMessages, downloaded]);

  useEffect(() => {
    if (!downloading) {
      startDownloading();
    }
  }, [downloading, queue]);

  useEffect(() => {
    writeFile("queue.json", queue);
  }, [queue]);

  useEffect(() => {
    writeFile("downloaded.json", downloaded);
  }, [downloaded]);

  useEffect(() => {
    writeFile("settings.json", settings);
  }, [settings]);

  useEffect(() => {
    writeFile("favorites.json", favorites);
  }, [favorites]);

  useEffect(() => {
    writeFile("library.json", library);
  }, [library]);

  useEffect(() => {
    while (libraryMessages.length > 0) {
      const message = libraryMessages.shift();
      if (message.addWebtoon) {
        setLibrary((library) => [...library, message.addWebtoon.webtoon]);
        dispatchSuccess(`Added ${message.addWebtoon.webtoon.title} to library`);
      }
      if (message.removeWebtoon) {
        let ww = library.find(
          (webtoon) =>
            `${webtoon.domain}_$_${webtoon.url}` ===
            `${message.removeWebtoon.domain}_$_${message.removeWebtoon.url}`
        );
        setLibrary((prevLibrary) =>
          prevLibrary.filter(
            (webtoon) =>
              `${webtoon.domain}_$_${webtoon.url}` !==
              `${message.removeWebtoon.domain}_$_${message.removeWebtoon.url}`
          )
        );
        dispatchSuccess(`Removed ${ww.title} from library`);
      }
      if (message.updateWebtoon) {
        setLibrary((prevLibrary) =>
          prevLibrary.map((webtoon) => {
            if (
              webtoon.domain === message.updateWebtoon.domain &&
              webtoon.url === message.updateWebtoon.url
            ) {
              webtoon.last_downloaded_chapter =
                message.updateWebtoon.last_downloaded_chapter;
            }
            return webtoon;
          })
        );
      }
    }
  }, [libraryMessages, library]);

  const startDownloading = async () => {
    if (downloading) {
      return;
    }
    const webtoon = queue.find((item) => item.status === "Started");
    if (webtoon) {
      setDownloading(webtoon);
      const { totalImages, downloading, ...rest } = webtoon;
      invoke("download", {
        webtoon: rest,
        fixedTitle: fixNameForFolder(webtoon.title),
        sleepTime: settings.sleep_time,
        downloadPath: settings.download_path,
        dataDirPath: settings.data_dir_path,
      });
      await listen("totalImages", (event) => {
        let totalImages = {
          totalImages: {
            id: event.payload.webtoon_id,
            total: event.payload.total_images,
          },
        };
        setQueueMessages((prevQueueMessages) => [
          ...prevQueueMessages,
          totalImages,
        ]);
      });
      await listen("downloading", (event) => {
        let downloading = {
          downloading: {
            id: event.payload.webtoon_id,
            image: event.payload.image,
          },
        };
        setQueueMessages((prevQueueMessages) => [
          ...prevQueueMessages,
          downloading,
        ]);
      });
      await listen("doneDownloading", (event) => {
        let done = {
          done: {
            id: event.payload.webtoon_id,
            download_path: event.payload.download_path,
          },
        };
        setQueueMessages((prevQueueMessages) => [...prevQueueMessages, done]);
      });
    }
  };

  const addQueueMessage = (message) => {
    setQueueMessages((prevQueueMessages) => [...prevQueueMessages, message]);
  };

  const addDownloadedMessage = (message) => {
    setDownloadedMessages((prevDownloadedMessages) => [
      ...prevDownloadedMessages,
      message,
    ]);
  };

  const addLibraryMessage = (message) => {
    setLibraryMessages((prevLibraryMessages) => [
      ...prevLibraryMessages,
      message,
    ]);
  };

  const addWebtoonToQueue = (webtoon) => {
    addQueueMessage({ addWebtoon: { webtoon } });
  };

  const startSearching = async (modules, keyword, depth, absolute) => {
    setSearchKeyword(keyword);
    setSelectedModulesForSearch(modules);
    setSearchResults([]);
    setSearchingStatus({ searching: { module: modules[0].name } });
    invoke("search_keyword", {
      modules: modules.map((item) => item.name),
      keyword,
      sleepTime: settings.sleep_time.toString(),
      depth: depth.toString(),
      absolute: absolute.toString(),
      dataDirPath: settings.data_dir_path,
    });
    await listen("doneSearching", () => {
      setSearchingStatus("searched");
    });
    await listen("searchingModule", (event) => {
      setSearchingStatus({
        searching: {
          module: event.payload.module,
        },
      });
    });
    await listen("searchedModule", (event) => {
      setSearchResults((prevResults) => [
        ...prevResults,
        ...JSON.parse(event.payload.result),
      ]);
    });
  };

  const resetSearch = () => {
    stopWorker("stop_search");
    setSearchKeyword("");
    setSearchingStatus(null);
    setSearchResults([]);
    setSelectedModulesForSearch([]);
  };

  return (
    <Router>
      <div>
        <TopBar
          currentDownloadStatus={
            downloading
              ? { downloading: downloading }
              : { downloaded: downloaded[0] }
          }
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/library"
            element={
              <Library
                library={library}
                addLibraryMessage={addLibraryMessage}
                addWebtoonToQueue={addWebtoonToQueue}
              />
            }
          />
          <Route
            path="/search"
            element={
              <Search
                startSearching={startSearching}
                searchingStatus={searchingStatus}
                searchResults={searchResults}
                resetSearch={resetSearch}
                selectedModulesForSearch={selectedModulesForSearch}
                searchKeyword={searchKeyword}
              />
            }
          />
          <Route
            path="/download"
            element={
              <Download
                queue={queue}
                addQueueMessage={addQueueMessage}
                downloaded={downloaded}
                addDownloadedMessage={addDownloadedMessage}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <Favorites favorites={favorites} setFavorites={setFavorites} />
            }
          />
          <Route path="/modules" element={<Modules />} />
          <Route
            path="/settings"
            element={<Settings downloading={downloading} />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/saucer" element={<Saucer />} />
          <Route
            path="/:module/webtoon/:url"
            element={
              <Webtoon
                addWebtoonToQueue={addWebtoonToQueue}
                favorites={favorites}
                setFavorites={setFavorites}
                addLibraryMessage={addLibraryMessage}
                library={library}
              />
            }
          />
          <Route path="/:module" element={<Module />} />
        </Routes>
        <div id="browse-modal" className="modal">
          <div className="modal-content" style={{ textAlign: "center" }}>
            You need to specify a folder to download the webtoons in it.
            <br />
            You can later change the folder in settings.
            <br />
            <br />
            <br />
            <PushButton
              label={"Browse"}
              onClick={async () => {
                let selectedPath = await open({
                  directory: true,
                });
                if (selectedPath) {
                  setSettings((prevSettings) => ({
                    ...prevSettings,
                    download_path: selectedPath,
                  }));
                  document.getElementById("browse-modal").style.display = "none";
                  startDownloading();
                }
              }}
            />
          </div>
        </div>
      </div>
    </Router>
  );
}

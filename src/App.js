import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Modules from "./pages/Modules";
import LPage from "./pages/Library";
import TopBar from "./components/TopBar";
import Search from "./pages/Search";
import HomePage from "./pages/Home";
import Webtoon from "./pages/Webtoon";
import Module from "./pages/Module";
import Download from "./pages/Download";
import Favorites from "./pages/Favorites";
import Saucer from "./pages/Saucer";
import Settings from "./pages/Settings";
import About from "./pages/About";
import { fixNameForFolder, convert, merge } from "./components/utils";
import PushButton from "./components/PushButton";
import { useNotification } from "./NotificationProvider";
import { useSheller } from "./ShellerProvider";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/dialog";
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";

export default function App() {
  const [settings, setSettings] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueMessages, setQueueMessages] = useState([]);
  const [downloadedMessages, setDownloadedMessages] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [downloaded, setDownloaded] = useState([]);
  const [searchingStatus, setSearchingStatus] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [libraryMessages, setLibraryMessages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedModulesForSearch, setSelectedModulesForSearch] = useState([]);
  const dispatch = useNotification();
  const sheller = useSheller();

  const readFile = async (fileName, setter) => {
    const contents = await readTextFile(fileName, {
      dir: BaseDirectory.AppLocalData,
    });
    if (fileName === "library.json") {
      const libraryRaw = JSON.parse(contents);
      setter(
        Object.entries(libraryRaw).map(([manga, detm]) => {
          return {
            title: manga,
            status: detm.include,
            domain: detm.domain,
            url: detm.url,
            cover: detm.cover,
            last_downloaded_chapter: detm.last_downloaded_chapter,
          };
        })
      );
    } else {
      setter(JSON.parse(contents));
    }
  };

  const writeFile = async (fileName, data) => {
    if (data) {
      if (fileName === "library.json") {
        await writeTextFile(
          fileName,
          JSON.stringify(
            data.reduce(
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
            ),
            null,
            2
          ),
          {
            dir: BaseDirectory.AppLocalData,
          }
        );
      } else {
        await writeTextFile(fileName, JSON.stringify(data, null, 2), {
          dir: BaseDirectory.AppLocalData,
        });
      }
    }
  };

  const removeDirectory = (path, recursive) => {
    invoke("remove_directory", { path, recursive });
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
        if (
          downloading &&
          message.setWebtoonStatus.webtoon.id === downloading.id &&
          (message.setWebtoonStatus.status === "Paused" ||
            message.setWebtoonStatus.status === "Not Started")
        ) {
          setDownloading(null);
        }
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
        if (
          (message.setAllWebtoonsStatus.status === "Paused" ||
            message.setAllWebtoonsStatus.status === "Not Started") &&
          downloading
        ) {
          setDownloading(null);
        }
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
        dispatch({
          type: "SUCCESS",
          message:
            webtoon.type === "manga"
              ? `Downloaded ${webtoon.title} - ${webtoon.info}`
              : `Downloaded ${webtoon.title}`,
          title: "Successful Request",
        });
        if (settings.auto_merge) {
          merge(
            webtoon,
            settings.download_path,
            settings.merge_method,
            false,
            dispatch,
            sheller,
            null
          );
        }
        if (settings.auto_convert) {
          convert(webtoon, false, dispatch, sheller, null);
        }
      }
      if (message.removeWebtoon) {
        setQueue((prevQueue) =>
          prevQueue.filter(
            (item) => item.id !== message.removeWebtoon.webtoon.id
          )
        );
        dispatch({
          type: "SUCCESS",
          message:
            message.removeWebtoon.webtoon.type === "manga"
              ? `Removed ${message.removeWebtoon.webtoon.title} - ${message.removeWebtoon.webtoon.info} from queue`
              : `Removed ${message.removeWebtoon.webtoon.title} from queue`,
          title: "Successful Request",
        });
        if (
          downloading &&
          message.removeWebtoon.webtoon.id === downloading.id
        ) {
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
          dispatch({
            type: "SUCCESS",
            message:
              message.addWebtoon.webtoon.type === "manga"
                ? `Added ${message.addWebtoon.webtoon.title} - ${message.addWebtoon.webtoon.info} to queue`
                : `Added ${message.addWebtoon.webtoon.title} to queue`,
            title: "Successful Request",
          });
        } else {
          setQueue((queue) => {
            let data = [...queue];
            let indexOfTodo = data.findIndex(
              (item) => item.id === message.addWebtoon.webtoon.id
            );
            data[indexOfTodo] = message.addWebtoon.webtoon;
            return data;
          });
          dispatch({
            type: "SUCCESS",
            message:
              message.addWebtoon.webtoon.type === "manga"
                ? `Updated ${message.addWebtoon.webtoon.title} - ${message.addWebtoon.webtoon.info} in queue`
                : `Updated ${message.addWebtoon.webtoon.title} in queue`,
            title: "Successful Request",
          });
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
        setDownloaded((downloaded) => {
          let data = [...downloaded];
          data.unshift(message.addWebtoon.webtoon);
          return data;
        });
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
        setLibrary((library) => {
          let data = [...library];
          data.push(message.addWebtoon.webtoon);
          return data;
        });
        dispatch({
          type: "SUCCESS",
          message: `Added ${message.addWebtoon.webtoon.title} to library`,
          title: "Successful Request",
        });
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
        dispatch({
          type: "SUCCESS",
          message: `Removed ${ww.title} from library`,
          title: "Successful Request",
        });
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
      invoke("download", {
        webtoon,
        downloadPath: settings.download_path,
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
      await listen("done", (event) => {
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
    setSelectedModulesForSearch(modules);
    setSearchResults([]);
    setSearchingStatus({ searching: { keyword } });
    invoke("search_keyword", {
      modules: modules.map((item) => item.name),
      keyword,
      depth: depth.toString(),
      absolute: absolute.toString(),
    });
    await listen("doneSearching", (event) => {
      setSearchingStatus({
        searched: { keyword: event.payload },
      });
    });
    await listen("searchingModule", (event) => {
      setSearchingStatus({
        searching: {
          module: event.payload.module,
          keyword: event.payload.keyword,
        },
      });
    });
    await listen("searchedModule", (event) => {
      setSearchResults((prevSearchResults) => [
        ...prevSearchResults,
        ...JSON.parse(event.payload),
      ]);
    });
  };

  const resetSearch = () => {
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
              <LPage
                library={library}
                addLibraryMessage={addLibraryMessage}
                addWebtoonToQueue={addWebtoonToQueue}
                loadCovers={settings ? settings.load_covers : true}
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
                defaultSearchDepth={settings ? settings.default_search_depth : 3}
                loadCovers={settings ? settings.load_covers : true}
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
                download_path={settings ? settings.download_path : ""}
                mergeMethod={settings ? settings.merge_method : "Normal"}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <Favorites
                favorites={favorites}
                setFavorites={setFavorites}
                loadCovers={settings ? settings.load_covers : true}
              />
            }
          />
          <Route
            path="/modules"
            element={
              <Modules loadCovers={settings ? settings.load_covers : true} />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                settings={settings}
                setSettings={setSettings}
                downloading={downloading}
                dispatch={dispatch}
              />
            }
          />
          <Route path="/about" element={<About />} />
          <Route
            path="/saucer"
            element={
              <Saucer loadCovers={settings ? settings.load_covers : true} />
            }
          />
          <Route
            path="/:module/webtoon/:url"
            element={
              <Webtoon
                addWebtoonToQueue={addWebtoonToQueue}
                favorites={favorites}
                setFavorites={setFavorites}
                addLibraryMessage={addLibraryMessage}
                library={library}
                loadCovers={settings ? settings.load_covers : true}
              />
            }
          />
          <Route
            path="/:module"
            element={
              <Module
                defaultSearchDepth={settings ? settings.default_search_depth : 3}
                sleepTime={settings ? settings.sleep_time : 0.1}
                loadCovers={settings ? settings.load_covers : true}
              />
            }
          />
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
                  const modal = document.getElementById("browse-modal");
                  modal.style.display = "none";
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

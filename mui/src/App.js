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
import { fixNameForFolder, convert, merge } from "./components/utils";
import PushButton from "./components/PushButton";
// eslint-disable-next-line
import Worker from "worker-loader!./worker.js";

function App() {
  const [settings, setSettings] = useState(null);
  const [queue, setQueue] = useState([]);
  const [downloadWorker, setDownloadWorker] = useState(null);
  const [queueMessages, setQueueMessages] = useState([]);
  const [downloadedMessages, setDownloadedMessages] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [downloaded, setDownloaded] = useState([]);
  const [searchWorker, setSearchWorker] = useState(null);
  const [searchingStatus, setSearchingStatus] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [libraryMessages, setLibraryMessages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedModulesForSearch, setSelectedModulesForSearch] = useState([]);
  const [settingsPath, setSettingsPath] = useState("");

  useEffect(() => {
    setSettingsPath(
      window.do.getSettingsPath().then((result) => {
        setSettingsPath(result);
        setQueue(window.do.getJsonFile(result, "queue.json"));
        setDownloaded(window.do.getJsonFile(result, "downloaded.json"));
        setFavorites(window.do.getJsonFile(result, "favorites.json"));
        setSettings(window.do.getJsonFile(result, "settings.json"));
        const libraryRaw = window.do.getJsonFile(result, "library.json");
        setLibrary(
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
      })
    );
  }, []);

  useEffect(() => {
    if (settings) {
      if (!settings.downloadPath) {
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
          window.do.removeFolder(
            message.setWebtoonStatus.webtoon.type === "manga"
              ? `${fixNameForFolder(message.setWebtoonStatus.webtoon.title)}/${
                  message.setWebtoonStatus.webtoon.info
                }`
              : fixNameForFolder(message.setWebtoonStatus.webtoon.title)
          );
          window.do.removeFolderIfEmpty(
            fixNameForFolder(message.setWebtoonStatus.webtoon.title)
          );
        }
        setQueue(updatedList);
        if (
          downloading &&
          message.setWebtoonStatus.webtoon.id === downloading.id &&
          (message.setWebtoonStatus.status === "Paused" ||
            message.setWebtoonStatus.status === "Not Started")
        ) {
          downloadWorker.terminate();
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
            window.do.removeFolder(
              webtoon.type === "manga"
                ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
                : fixNameForFolder(webtoon.title)
            );
            if (webtoon.type === "manga") {
              window.do.removeFolderIfEmpty(fixNameForFolder(webtoon.title));
            }
          }
        }
        setQueue(updatedList);
        if (
          (message.setAllWebtoonsStatus.status === "Paused" ||
            message.setAllWebtoonsStatus.status === "Not Started") &&
          downloading
        ) {
          downloadWorker.terminate();
          setDownloading(null);
        }
        if (message.setAllWebtoonsStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.done) {
        setDownloading(null);
        setQueue(queue.filter((item) => item.id !== message.done.webtoon.id));
        if (message.done.webtoon.in_library) {
          addLibraryMessage({
            updateWebtoon: {
              domain: message.done.webtoon.module,
              url: message.done.webtoon.manga,
              last_downloaded_chapter: {
                name: message.done.webtoon.info,
                url: message.done.webtoon.chapter,
              },
            },
          });
        }
        let newD = message.done.webtoon;
        delete newD.status;
        delete newD.in_library;
        newD.images = message.done.images;
        newD.path = message.done.path;
        addDownloadedMessage({ addWebtoon: { webtoon: newD } });
        if (settings.autoMerge) {
          merge(newD, settings.downloadPath, settings.mergeMethod, false);
        }
        if (settings.autoConvert) {
          convert(newD, false);
        }
      }
      if (message.removeWebtoon) {
        setQueue((prevQueue) =>
          prevQueue.filter(
            (item) => item.id !== message.removeWebtoon.webtoon.id
          )
        );
        if (
          downloading &&
          message.removeWebtoon.webtoon.id === downloading.id
        ) {
          downloadWorker.terminate();
          setDownloading(null);
        }
        window.do.removeFolder(
          message.removeWebtoon.webtoon.type === "manga"
            ? `${fixNameForFolder(message.removeWebtoon.webtoon.title)}/${
                message.removeWebtoon.webtoon.info
              }`
            : fixNameForFolder(message.removeWebtoon.webtoon.title)
        );
      }
      if (message.addWebtoon) {
        if (!queue.find((item) => item.id === message.addWebtoon.webtoon.id)) {
          setQueue((queue) => {
            let data = [...queue];
            data.push(message.addWebtoon.webtoon);
            return data;
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
        }
      }
      if (message.downloading) {
        setQueue((queue) => {
          let data = [...queue];
          let indexOfTodo = data.findIndex(
            (item) => item.id === message.downloading.webtoon.id
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
            (item) => item.id === message.totalImages.webtoon.id
          );
          data[indexOfTodo] = {
            ...data[indexOfTodo],
            totalImages: message.totalImages.total,
          };
          return data;
        });
      }
      if (message.reOrderQueue) {
        const newQueue = message.reOrderQueue.order.map((webtoon) =>
          queue.find((item) => item.id === webtoon)
        );
        setQueue(newQueue);
      }
      if (message.rempveImage) {
        window.do.deleteImage(message.rempveImage.saved_path);
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
        setDownloaded(
          downloaded.filter((_, index) => index !== message.removeWebtoon.index)
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
    if (settingsPath !== "") {
      window.do.setJsonFile(settingsPath, "queue.json", queue);
    }
  }, [queue]);

  useEffect(() => {
    if (settingsPath !== "") {
      window.do.setJsonFile(settingsPath, "downloaded.json", downloaded);
    }
  }, [downloaded]);

  useEffect(() => {
    if (settingsPath !== "") {
      window.do.setJsonFile(settingsPath, "settings.json", settings);
    }
  }, [settings]);

  useEffect(() => {
    if (settingsPath !== "") {
      window.do.setJsonFile(settingsPath, "favorites.json", favorites);
    }
  }, [favorites]);

  useEffect(() => {
    if (settingsPath !== "") {
      window.do.setJsonFile(
        settingsPath,
        "library.json",
        library.reduce(
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
        )
      );
    }
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
      }
      if (message.removeWebtoon) {
        setLibrary(
          library.filter(
            (webtoon) =>
              `${webtoon.domain}_$_${webtoon.url}` !==
              `${message.removeWebtoon.domain}_$_${message.removeWebtoon.url}`
          )
        );
      }
      if (message.updateWebtoon) {
        setLibrary(
          library.map((webtoon) => {
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
      const folderName =
        webtoon.type === "manga"
          ? fixNameForFolder(webtoon.title) + "\\" + webtoon.info
          : fixNameForFolder(webtoon.title);
      const dPath = settings.downloadPath + "\\" + folderName;
      await window.do.createFolder(dPath);
      const dirls = window.do.ls(dPath);
      const dWorker = new Worker();
      // new URL("./downloadWorker.js", import.meta.url), {type: "module"}
      //"./downloadWorker.js", {type: "module"}
      dWorker.postMessage({ download: { webtoon, dPath, dirls } });
      dWorker.onmessage = (e) => {
        if (
          !e.data.doneSearching &&
          !e.data.searchedModule &&
          !e.data.searchingModule
        ) {
          setQueueMessages([...queueMessages, e.data]);
        }
      };
      setDownloadWorker(dWorker);
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

  const startSearching = (modules, keyword, depth, absolute) => {
    setSelectedModulesForSearch(modules);
    setSearchResults([]);
    setSearchingStatus({ searching: { keyword } });
    const sWorker = new Worker();
    sWorker.postMessage({
      search: {
        modules: modules.map((item) => item.name),
        keyword,
        depth,
        absolute,
        sleepTime: settings.sleepTime,
      },
    });
    sWorker.onmessage = (e) => {
      if (e.data.doneSearching) {
        setSearchingStatus({
          searched: { keyword: e.data.doneSearching.keyword },
        });
      }
      if (e.data.searchingModule) {
        setSearchingStatus({
          searching: {
            module: e.data.searchingModule.module,
            keyword: e.data.searchingModule.keyword,
          },
        });
      }
      if (e.data.searchedModule) {
        setSearchResults((prevSearchResults) => [
          ...prevSearchResults,
          ...e.data.searchedModule.response,
        ]);
      }
    };
    setSearchWorker(sWorker);
  };

  const resetSearch = () => {
    setSearchingStatus(null);
    setSearchResults([]);
    setSelectedModulesForSearch([]);
    if (searchWorker) {
      searchWorker.terminate();
    }
    setSearchWorker(null);
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
                defaultSearchDepth={settings ? settings.defaultSearchDepth : 3}
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
                downloadPath={settings ? settings.downloadPath : ""}
                mergeMethod={settings ? settings.mergeMethod : "Normal"}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <Favorites favorites={favorites} setFavorites={setFavorites} />
            }
          />
          <Route
            path="/modules"
            element={<Modules settingsPath={settingsPath} />}
          />
          <Route
            path="/settings"
            element={
              <Settings
                settings={settings}
                setSettings={setSettings}
                downloading={downloading}
              />
            }
          />
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
          <Route
            path="/:module"
            element={
              <Module
                defaultSearchDepth={settings ? settings.defaultSearchDepth : 3}
                sleepTime={settings ? settings.sleepTime : 0.1}
              />
            }
          />
        </Routes>
        <div id="browse-modal" className="modal">
          <div className="modal-content" style={{ textAlign: "center" }}>
            You need to specify a folder to download the webtoons in it.
            <br />
            You canlater change the folder in settings.
            <br />
            <br />
            <br />
            <PushButton
              label={"Browse"}
              onClick={() =>
                window.do.selectFolder().then((result) => {
                  if (result) {
                    setSettings({ ...settings, downloadPath: result });
                    const modal = document.getElementById("browse-modal");
                    modal.style.display = "none";
                    startDownloading();
                  }
                })
              }
            />
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;

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
import { useSheller, useShellerPathSetter } from "./ShellerProvider";
// eslint-disable-next-line
import Worker from "worker-loader!./worker.js";

export default function App() {
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
  const dispatch = useNotification();
  const sheller = useSheller();
  const shellerPathSetter = useShellerPathSetter();

  useEffect(() => {
    // setSettingsPath(
    //   window.do.getSettingsPath().then((result) => {
    //     setSettingsPath(result);
    //     setQueue(window.do.getJsonFile(result, "queue.json"));
    //     setDownloaded(window.do.getJsonFile(result, "downloaded.json"));
    //     setFavorites(window.do.getJsonFile(result, "favorites.json"));
    //     setSettings(window.do.getJsonFile(result, "settings.json"));
    //     const libraryRaw = window.do.getJsonFile(result, "library.json");
    //     setLibrary(
    //       Object.entries(libraryRaw).map(([manga, detm]) => {
    //         return {
    //           title: manga,
    //           status: detm.include,
    //           domain: detm.domain,
    //           url: detm.url,
    //           cover: detm.cover,
    //           last_downloaded_chapter: detm.last_downloaded_chapter,
    //         };
    //       })
    //     );
    //   })
    // );
  }, []);

  useEffect(() => {
    if (settings) {
      if (!settings.downloadPath) {
        const modal = document.getElementById("browse-modal");
        modal.style.display = "block";
      } else {
        startDownloading();
      }
      shellerPathSetter(settings.shellerPath);
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
          window.do.removeFolder(`${settings.downloadPath}/${folderName}`);
          if (message.setWebtoonStatus.webtoon.type === "manga") {
            window.do.removeFolderIfEmpty(
              `${settings.downloadPath}/${fixNameForFolder(message.setWebtoonStatus.webtoon.title)}`
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
            let folderName =
              webtoon.type === "manga"
                ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
                : fixNameForFolder(webtoon.title);
            window.do.removeFolder(`${settings.downloadPath}/${folderName}`);
            if (webtoon.type === "manga") {
              window.do.removeFolderIfEmpty(
                `${settings.downloadPath}/${fixNameForFolder(webtoon.title)}`
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
          downloadWorker.terminate();
          setDownloading(null);
        }
        if (message.setAllWebtoonsStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.done) {
        setDownloading(null);
        setQueue((prevQueue) =>
          prevQueue.filter((item) => item.id !== message.done.webtoon.id)
        );
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
        dispatch({
          type: "SUCCESS",
          message:
            message.done.webtoon.type === "manga"
              ? `Downloaded ${message.done.webtoon.title} - ${message.done.webtoon.info}`
              : `Downloaded ${message.done.webtoon.title}`,
          title: "Successful Request",
        });
        if (settings.autoMerge) {
          merge(
            newD,
            settings.downloadPath,
            settings.mergeMethod,
            false,
            dispatch,
            sheller
          );
        }
        if (settings.autoConvert) {
          convert(newD, false, dispatch, sheller);
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
          downloadWorker.terminate();
          setDownloading(null);
        }
        let folderName =
          message.removeWebtoon.webtoon.type === "manga"
            ? `${fixNameForFolder(message.removeWebtoon.webtoon.title)}/${
                message.removeWebtoon.webtoon.info
              }`
            : fixNameForFolder(message.removeWebtoon.webtoon.title);
        window.do.removeFolder(`${settings.downloadPath}/${folderName}`);
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
        setQueue((prevQueue) => {
          return message.reOrderQueue.order.map((webtoon) =>
            prevQueue.find((item) => item.id === webtoon)
          );
        });
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
      const dWorker = new Worker();
      dWorker.postMessage({
        download: {
          webtoon,
          downloadPath: settings.downloadPath,
          shellerPath: settings.shellerPath,
        },
      });
      dWorker.onmessage = (e) => {
        if (
          !e.data.doneSearching &&
          !e.data.searchedModule &&
          !e.data.searchingModule
        ) {
          setQueueMessages((prevQueueMessages) => [
            ...prevQueueMessages,
            e.data,
          ]);
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
        shellerPath: settings.shellerPath,
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
                loadCovers={settings ? settings.loadCovers : true}
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
                loadCovers={settings ? settings.loadCovers : true}
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
              <Favorites
                favorites={favorites}
                setFavorites={setFavorites}
                loadCovers={settings ? settings.loadCovers : true}
              />
            }
          />
          <Route
            path="/modules"
            element={
              <Modules
                settingsPath={settingsPath}
                loadCovers={settings ? settings.loadCovers : true}
              />
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
              <Saucer loadCovers={settings ? settings.loadCovers : true} />
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
                loadCovers={settings ? settings.loadCovers : true}
              />
            }
          />
          <Route
            path="/:module"
            element={
              <Module
                defaultSearchDepth={settings ? settings.defaultSearchDepth : 3}
                sleepTime={settings ? settings.sleepTime : 0.1}
                loadCovers={settings ? settings.loadCovers : true}
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
              onClick={() =>
                window.do.selectFolder().then((result) => {
                  if (result) {
                    setSettings((prevSettings) => ({
                      ...prevSettings,
                      downloadPath: result,
                    }));
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

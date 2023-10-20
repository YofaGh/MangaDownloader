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
import { fixNameForFolder } from "./components/utils";
// eslint-disable-next-line
import Worker from "worker-loader!./worker.js";

function App() {
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

  useEffect(() => {
    setQueue(window.do.getJsonFile("queue.json"));
    setDownloaded(window.do.getJsonFile("downloaded.json"));
    const libraryRaw = window.do.getJsonFile("library.json");
    setLibrary(
      Object.entries(libraryRaw).map(([manga, detm]) => {
        return {
          title: manga,
          status: detm.include,
          domain: detm.domain,
          url: detm.url,
          cover: detm.cover,
          last_downloaded_chapter: detm.last_downloaded_chapter,
          chapters: detm.chapters,
        };
      })
    );
    startDownloading();
  }, []);

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
          item.status = message.setAllWebtoonsStatus.status;
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
      }
      if (message.removeWebtoon) {
        setQueue(
          queue.filter((item) => item.id !== message.removeWebtoon.webtoon.id)
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
    }
  }, [downloadedMessages, downloaded]);

  useEffect(() => {
    if (!downloading) {
      startDownloading();
    }
  }, [downloading, queue]);

  useEffect(() => {
    window.do.setJsonFile("queue.json", queue);
  }, [queue]);

  useEffect(() => {
    window.do.setJsonFile("downloaded.json", downloaded);
  }, [downloaded]);

  useEffect(() => {
    window.do.setJsonFile(
      "library.json",
      library.reduce(
        (
          acc,
          {
            title,
            status,
            domain,
            url,
            cover,
            last_downloaded_chapter,
            chapters,
          }
        ) => {
          acc[title] = {
            include: status,
            domain,
            url,
            cover,
            last_downloaded_chapter,
            chapters,
          };
          return acc;
        },
        {}
      )
    );
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
    const webtoon = queue.find((item) => item.status === "Started");
    setDownloading(webtoon);
    if (webtoon) {
      const folderName =
        webtoon.type === "manga"
          ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
          : fixNameForFolder(webtoon.title);
      await window.do.createFolder(folderName);
      const dirls = window.do.ls(folderName);
      const dWorker = new Worker();
      // new URL("./downloadWorker.js", import.meta.url), {type: "module"}
      //"./downloadWorker.js", {type: "module"}
      dWorker.postMessage({ download: { webtoon, dirls } });
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
    setDownloadedMessages([...downloadedMessages, message]);
  };

  const addLibraryMessage = (message) => {
    setLibraryMessages([...libraryMessages, message]);
  };

  const addWebtoon = (webtoon) => {
    addQueueMessage({ addWebtoon: { webtoon } });
  };

  const startSearching = (modules, keyword, depth, absolute) => {
    setSearchResults([]);
    setSearchingStatus({ searching: { keyword } });
    const sWorker = new Worker();
    sWorker.postMessage({
      search: { modules, keyword, depth, absolute, sleepTime: 0.1 },
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
    if (searchWorker) {
      searchWorker.terminate();
    }
    setSearchWorker(null);
  };

  return (
    <Router>
      <div>
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/library"
            element={
              <LPage
                library={library}
                addLibraryMessage={addLibraryMessage}
                addWebtoon={addWebtoon}
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
          <Route path="/modules" element={<Modules />} />
          <Route
            path="/:module/webtoon/:url"
            element={<Webtoon addWebtoon={addWebtoon} />}
          />
          <Route path="/:module" element={<Module />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

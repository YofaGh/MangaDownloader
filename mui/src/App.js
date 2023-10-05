import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Modules from "./pages/Modules";
import LPage from "./pages/Library";
import TopBar from "./components/TopBar";
import Search from "./pages/Search";
import HomePage from "./pages/Home";
import Webtoon from "./pages/Webtoon";
import Module from "./pages/Module";
import Queue from "./pages/Queue";
import { fixNameForFolder } from "./components/utils";

function App() {
  const [queue, setQueue] = useState([]);
  const [worker, setWorker] = useState(null);
  const [queueMessages, setQueueMessages] = useState([]);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    setQueue(window.do.getJsonFile("queue.json"));
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
        }
        setQueue(updatedList);
        if (
          downloading &&
          message.setWebtoonStatus.webtoon.id === downloading.id &&
          (message.setWebtoonStatus.status === "Paused" ||
            message.setWebtoonStatus.status === "Not Started")
        ) {
          worker.terminate();
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
          }
        }
        setQueue(updatedList);
        if (
          (message.setAllWebtoonsStatus.status === "Paused" ||
            message.setAllWebtoonsStatus.status === "Not Started") &&
          downloading
        ) {
          worker.terminate();
          setDownloading(null);
        }
        if (message.setAllWebtoonsStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.done) {
        setDownloading(null);
        setQueue((queue) => {
          let data = [...queue];
          let indexOfTodo = data.findIndex(
            (item) => item.id === message.done.webtoon.id
          );
          data[indexOfTodo] = {
            ...data[indexOfTodo],
            status: "Finished",
          };
          return data;
        });
      }
      if (message.removeWebtoon) {
        setQueue(
          queue.filter((item) => item.id !== message.removeWebtoon.webtoon.id)
        );
        if (
          downloading &&
          message.removeWebtoon.webtoon.id === downloading.id
        ) {
          worker.terminate();
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
    if (!downloading) {
      startDownloading();
    }
  }, [downloading, queue]);

  useEffect(() => {
    window.do.setJsonFile("queue.json", queue);
  }, [queue]);

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
      const dWorker = new Worker(
        new URL("./downloadWorker.js", import.meta.url)
      );
      dWorker.postMessage({ webtoon, dirls });
      dWorker.onmessage = (e) => {
        setQueueMessages([...queueMessages, e.data]);
      };
      setWorker(dWorker);
    }
  };

  const addQueueMessage = (message) => {
    setQueueMessages([...queueMessages, message]);
  };

  const addWebtoon = (webtoon) => {
    addQueueMessage({ addWebtoon: { webtoon } });
  };

  return (
    <Router>
      <div>
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LPage />} />
          <Route path="/search" element={<Search />} />
          <Route
            path="/queue"
            element={<Queue queue={queue} addQueueMessage={addQueueMessage} />}
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

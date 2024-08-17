import { Queue, Downloaded, PushButton } from "../components";
import { useDownloadTabStore } from "../store";

export default function Download() {
  const { downloadTab, setDownloadTab } = useDownloadTabStore();

  return (
    <div className="container">
      <div className="scrollmenu">
        <PushButton label={"Queue"} onClick={() => setDownloadTab("queue")} />
        <PushButton
          label={"Downloaded"}
          onClick={() => setDownloadTab("downloaded")}
        />
      </div>
      {downloadTab === "queue" ? <Queue /> : <Downloaded />}
    </div>
  );
}

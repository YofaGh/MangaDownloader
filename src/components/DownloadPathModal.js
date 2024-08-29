import { PushButton, startDownloading } from ".";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsStore } from "../store";

export default function DownloadPathModal() {
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const setDownloadPath = async () => {
    let download_path = await open({ directory: true });
    if (!download_path) return;
    updateSettings({ download_path });
    document.getElementById("browse-modal").style.display = "none";
    startDownloading();
  };

  return (
    <div id="browse-modal" className="modal">
      <div className="modal-content" style={{ textAlign: "center" }}>
        You need to specify a folder to download the webtoons in it.
        <br />
        You can later change the folder in settings.
        <br />
        <br />
        <br />
        <PushButton label="Browse" onClick={setDownloadPath} />
      </div>
    </div>
  );
}

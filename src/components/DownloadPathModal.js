import { PushButton } from ".";
import { open } from "@tauri-apps/plugin-dialog";
import {
  useSettingsStore,
  useInitDownloadStore,
} from "../store";

export default function DownloadPathModal() {
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const increaseInitDownload = useInitDownloadStore((state) => state.increaseInitDownload);

  const setDownloadPath = async () => {
    let selectedPath = await open({
      directory: true,
    });
    if (!selectedPath) {
      return;
    }
    updateSettings({ download_path: selectedPath });
    document.getElementById("browse-modal").style.display = "none";
    increaseInitDownload();
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

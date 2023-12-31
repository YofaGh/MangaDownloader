import "../styles/DCard.css";
import { convert, merge } from "../components/utils";
import { useNotification } from "../NotificationProvider";
import { useSheller } from "../ShellerProvider";

export default function DCard({
  webtoon,
  removeWebtoon,
  downloadPath,
  mergeMethod,
}) {
  const dispatch = useNotification();
  const sheller = useSheller();

  const deleteFolder = () => {
    window.do.removeFolder(webtoon.path);
    removeWebtoon(webtoon);
  };

  return (
    <div className="queue-card">
      <div className="infog">
        <div className="card-titlee">{webtoon.title}</div>
        <div className="card-info">{webtoon.info}</div>
        <div className="card-domain">{webtoon.module}</div>
      </div>
      <div className="statusg">
        <div className="d-status">Downladed {webtoon.images + ""} Images</div>
      </div>
      <div className="button-containerrr">
        <button
          className="buttonh"
          onClick={() =>
            merge(webtoon, downloadPath, mergeMethod, true, dispatch, sheller)
          }
        >
          <img alt="" src="./assets/merge.svg" className="icofn"></img>
          <span className="tooltip">Merge</span>
        </button>
        <button
          className="buttonh"
          onClick={() => convert(webtoon, true, dispatch, sheller)}
        >
          <img alt="" src="./assets/pdf.svg" className="icofn"></img>
          <span className="tooltip">Convert to PDF</span>
        </button>
        <button className="buttonh" onClick={removeWebtoon}>
          <img alt="" src="./assets/delete.svg" className="icon"></img>
          <span className="tooltip">Remove</span>
        </button>
        <button className="buttonh" onClick={deleteFolder}>
          <img alt="" src="./assets/trash.svg" className="icon"></img>
          <span className="tooltip">Delete Folder</span>
        </button>
      </div>
    </div>
  );
}

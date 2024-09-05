import { convert, merge } from "../../utils";
import { ActionButtonCustom, ActionButtonSmall } from "..";

export default function DCard({ webtoon, removeWebtoon, deleteFolder }) {
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
        <ActionButtonCustom
          onClick={() => merge(webtoon, true)}
          svgName="merge"
          tooltip="Merge"
        />
        <ActionButtonCustom
          onClick={() => convert(webtoon, true)}
          svgName="pdf"
          tooltip="Convert to PDF"
        />
        <ActionButtonSmall
          onClick={() => removeWebtoon(webtoon.id)}
          svgName="delete"
          tooltip="Remove"
        />
        <ActionButtonSmall
          onClick={() => deleteFolder(webtoon)}
          svgName="trash"
          tooltip="Delete Folder"
        />
      </div>
    </div>
  );
}

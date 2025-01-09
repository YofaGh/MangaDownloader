import { ActionButton } from "..";
import { convert, merge } from "../../utils";

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
        <ActionButton
          svgName="merge"
          tooltip="Merge"
          icnClassName="icofn"
          onClick={() => merge(webtoon, true)}
        />
        <ActionButton
          svgName="pdf"
          icnClassName="icofn"
          tooltip="Convert to PDF"
          onClick={() => convert(webtoon, true)}
        />
        <ActionButton
          svgName="delete"
          tooltip="Remove"
          onClick={() => removeWebtoon(webtoon.id)}
        />
        <ActionButton
          svgName="trash"
          tooltip="Delete Folder"
          onClick={() => deleteFolder(webtoon)}
        />
      </div>
    </div>
  );
}

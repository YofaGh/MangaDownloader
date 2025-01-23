import { useState } from "react";
import { Link } from "react-router-dom";
import { ActionButton } from "..";
import { convert, merge, openFolder, showInBrowser } from "../../utils";

export default function DCard({
  webtoon,
  removeWebtoon,
  deleteFolder,
  restart,
}) {
  const webtoonLink = `/${webtoon.module}/webtoon/${
    webtoon.manga || webtoon.doujin
  }`;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="queue-card">
      <div
        className={`infog ${isExpanded ? "expanded" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
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
          svgName="maximize"
          tooltip="Show in browser"
          onClick={() => showInBrowser(webtoon)}
        />
        <Link to={webtoonLink}>
          <ActionButton svgName="about" tooltip="Go to Webtoon" />
        </Link>
        <ActionButton
          svgName="restart"
          tooltip="Download Again"
          onClick={() => restart(webtoon)}
        />
        <ActionButton
          svgName="folder"
          tooltip="Open Folder"
          onClick={() => openFolder(webtoon.path)}
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

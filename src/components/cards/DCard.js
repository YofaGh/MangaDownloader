import { ActionButtonCustom, ActionButtonSmall } from "..";

export default function DCard({
  webtoon,
  index,
  removeWebtoon,
  deleteFolder,
  mergeImages,
  convertImages,
}) {
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
        <ActionButtonCustom onClick={() => mergeImages(webtoon)} svgName="merge" tooltip="Merge" />
        <ActionButtonCustom onClick={() => convertImages(webtoon)} svgName="pdf" tooltip="Convert to PDF" />
        <ActionButtonSmall onClick={() => removeWebtoon(index)} svgName="delete" tooltip="Remove" />
        <ActionButtonSmall onClick={() => deleteFolder(webtoon.path, index)} svgName="trash" tooltip="Delete Folder" />
      </div>
    </div>
  );
}

import DCard from "./DCard";

export default function Downloaded({ downloaded, addDownloadedMessage }) {
  return (
    <div className="queue-div">
      <div className="manage">
        <div className="info-manage">Number of Items: {downloaded.length}</div>
        <div className="manage-btn">
          <button className="buttong" onClick={() => {}}>
            <img alt="" src="./assets/delete.svg" className="icon"></img>
            <span className="tooltip">Remove All from List</span>
          </button>
          <button className="buttong" onClick={() => {}}>
            <img alt="" src="./assets/trash.svg" className="icon"></img>
            <span className="tooltip">Delete All</span>
          </button>
          <button className="buttong" onClick={() => {}}>
            <img alt="" src="./assets/merge.svg" className="icon"></img>
            <span className="tooltip">Merge All</span>
          </button>
          <button className="buttong" onClick={() => {}}>
            <img alt="" src="./assets/pdf.svg" className="icon"></img>
            <span className="tooltip">Convert All to PDF</span>
          </button>
        </div>
      </div>
      <div className="queue-list">
        <ul className="ul-queue">
          {downloaded.map((webtoon, index) => {
            return (
              <li key={webtoon.id}>
                <DCard
                  webtoon={webtoon}
                  removeWebtoon={() =>
                    addDownloadedMessage({ removeWebtoon: { index } })
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

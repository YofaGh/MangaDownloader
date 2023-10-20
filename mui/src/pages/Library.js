import "./../App.css";
import Wcard from "./../components/webtoonCard";

function LPage({ library, addLibraryMessage, addWebtoon }) {
  const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  const chunkedWebtoons = chunkArray(library, 3);
  return (
    <div>
      <div className="container">
        <div className="top-header">Library</div>
        <div className="card-row-container">
          {chunkedWebtoons.map((chunk, index) => (
            <div key={index} className="card-row">
              {chunk.map((webtoon) => (
                <div key={webtoon} className="card-wrapper">
                  <Wcard webtoon={webtoon} addLibraryMessage={addLibraryMessage} addWebtoon={addWebtoon}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LPage;

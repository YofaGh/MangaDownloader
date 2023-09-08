import "./../App.css";
import React, { useState, useEffect } from "react";
import get_library from "../api/get_library";
import Wcard from "./../components/webtoonCard";

function LPage() {
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    const fetchLibrary = async () => {
      const response = await get_library();
      setLibrary(response);
    };
    fetchLibrary();
  }, []);

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
        <div className="top-header">
          Library
        </div>
        <div className="card-row-container">
          {chunkedWebtoons.map((chunk, index) => (
            <div key={index} className="card-row">
              {chunk.map((webtoon) => (
                <div key={webtoon} className="card-wrapper">
                  <Wcard webtoon={webtoon} />
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

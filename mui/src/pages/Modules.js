import "./../App.css";
import React, { useState, useEffect } from "react";
import MCard from "../components/moduleCard";
import get_modules from "../api/get_modules";

function Modules() {
  const [modules, setModules] = useState([]);
  const fetchModules = async () => {
    const response = await get_modules();
    setModules(response);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  const chunkedModules = chunkArray(modules, 3);

  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Modules</h1>
        </div>
      </div>
      <div className="card-row-container">
        {chunkedModules.map((chunk, index) => (
          <div key={index} className="card-row">
            {chunk.map((module) => (
              <div key={module} className="card-wrapper">
                <MCard module={module} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Modules;

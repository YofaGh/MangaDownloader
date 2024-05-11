import { useState, useEffect } from "react";
import { MCard, chunkArray } from "../components";
import { useSettings } from "../Provider";
import { invoke } from "@tauri-apps/api/core";

export default function Modules() {
  const [modules, setModules] = useState([]);
  const { load_covers } = useSettings();
  const chunkedModules = chunkArray(modules, 3);

  useEffect(() => {
    const fetchModules = async () => {
      invoke("get_modules").then((response) => {
        setModules(response);
      });
    };
    fetchModules();
  },);

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
              <div key={module.domain} className="card-wrapper">
                <MCard
                  module={module}
                  load_covers={load_covers}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

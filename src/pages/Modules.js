import { MCard, chunkArray } from "../components";
import { useSettings } from "../Provider";

export default function Modules() {
  const modules = [
    {
      type: "Manga",
      domain: "manhuascan.us",
      logo: "https://manhuascan.us/fav.png?v=1",
      searchable: true,
      is_coded: false,
    },
  ];
  const { load_covers } = useSettings();
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

import { HomeButton } from "../components";

export default function Home() {
  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Manga Downloader</h1>
        </div>
        <div className="home-buttons">
          <HomeButton label="Library" svgName="library" />
          <HomeButton label="Search" svgName="search" />
          <HomeButton label="Download" svgName="dPage" />
          <HomeButton label="Modules" svgName="module" />
          <HomeButton label="Favorites" svgName="heart" />
          <HomeButton label="Saucer" svgName="saucer" />
        </div>
      </div>
    </div>
  );
}

import "../styles/Settings.css";
import FilterToggleButton from "../components/FilterToggleButton";

export default function Settings({
  settings,
  setSettings,
  downloading,
  dispatch,
}) {
  return (
    <div className="container">
      <div className="f-header">Settings</div>
      <div className="s-utils">
        <div className="in-depth">
          <label className="cyb-checkbox-label">
            Auto Merge:&nbsp;
            <input
              type="checkbox"
              className="cyberpunk-checkbox"
              checked={settings.autoMerge}
              onChange={() =>
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  autoMerge: !prevSettings.autoMerge,
                }))
              }
            ></input>
          </label>
        </div>
        <div className="in-depth">
          <label className="cyb-checkbox-label">
            Auto Convert To PDF:&nbsp;
            <input
              type="checkbox"
              className="cyberpunk-checkbox"
              checked={settings.autoConvert}
              onChange={() =>
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  autoConvert: !prevSettings.autoConvert,
                }))
              }
            ></input>
          </label>
        </div>
        <div className="cyb-checkbox-label">
          Merge Method:&nbsp;
          <FilterToggleButton
            label={"Normal"}
            selected={settings.mergeMethod === "Normal"}
            onChange={() => {
              if (settings.mergeMethod === "Fit") {
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  mergeMethod: "Normal",
                }));
              }
            }}
          />
          <FilterToggleButton
            label={"Fit"}
            selected={settings.mergeMethod === "Fit"}
            onChange={() => {
              if (settings.mergeMethod === "Normal") {
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  mergeMethod: "Fit",
                }));
              }
            }}
          />
        </div>
      </div>
      <div className="s-utils">
        <div className="in-depth">
          <label className="cyb-checkbox-label">
            Load Covers: &nbsp;
            <input
              type="checkbox"
              className="cyberpunk-checkbox"
              checked={settings.loadCovers}
              onChange={() =>
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  loadCovers: !prevSettings.loadCovers,
                }))
              }
            ></input>
          </label>
        </div>
        <div className="cyb-checkbox-label">
          Sleep Time:&nbsp;&nbsp;
          <input
            type="number"
            name="text"
            className="input-depth"
            defaultValue={settings.sleepTime}
            onChange={(e) =>
              e.target.valueAsNumber > 0 &&
              setSettings((prevSettings) => ({
                ...prevSettings,
                sleepTime: e.target.valueAsNumber,
              }))
            }
          ></input>
          &nbsp;&nbsp;
        </div>
        <div className="cyb-checkbox-label">
          Default Search Depth: &nbsp;&nbsp;
          <input
            type="number"
            name="text"
            className="input-depth"
            defaultValue={settings.defaultSearchDepth}
            onChange={(e) =>
              e.target.valueAsNumber > 0 &&
              setSettings((prevSettings) => ({
                ...prevSettings,
                defaultSearchDepth: e.target.valueAsNumber,
              }))
            }
          ></input>
          &nbsp;&nbsp;
        </div>
      </div>
      <div className="cyb-checkbox-label">
        Download Path:&nbsp;
        <input
          className="input"
          name="text"
          type="text"
          value={settings.downloadPath}
        ></input>
        <span
          className="playstore-button texts"
          onClick={() => {
            if (downloading) {
              dispatch({
                type: "ERROR",
                message: "There's a download in progress. Stop it first.",
                title: "Error",
              });
              return;
            }
            window.do.selectFolder().then((result) => {
              if (result) {
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  downloadPath: result,
                }));
              }
            });
          }}
        >
          <span className="text-2">Browse</span>
        </span>
      </div>
    </div>
  );
}

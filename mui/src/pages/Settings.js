import "../styles/Settings.css";
import FilterToggleButton from "../components/FilterToggleButton";

export default function Settings({ settings, setSettings }) {
  return (
    <div className="container">
      <div className="in-depth">
        <label className="cyb-checkbox-label">
          Auto Merge&nbsp;
          <input
            type="checkbox"
            className="cyberpunk-checkbox"
            checked={settings.autoMerge}
            onChange={() =>
              setSettings({ ...settings, autoMerge: !settings.autoMerge })
            }
          ></input>
        </label>
      </div>
      <div className="in-depth">
        <label className="cyb-checkbox-label">
          Auto Convert To PDF&nbsp;
          <input
            type="checkbox"
            className="cyberpunk-checkbox"
            checked={settings.autoConvert}
            onChange={() =>
              setSettings({ ...settings, autoConvert: !settings.autoConvert })
            }
          ></input>
        </label>
      </div>
      <div className="in-depth">
        <label className="cyb-checkbox-label">
          Load Covers&nbsp;
          <input
            type="checkbox"
            className="cyberpunk-checkbox"
            checked={settings.loadCovers}
            onChange={() =>
              setSettings({ ...settings, loadCovers: !settings.loadCovers })
            }
          ></input>
        </label>
      </div>
      <div className="cyb-checkbox-label">
        <h2>Sleep Time&nbsp;&nbsp;</h2>
        <input
          type="number"
          name="text"
          className="input-depth"
          defaultValue={settings.sleepTime}
          onChange={(e) =>
            setSettings({ ...settings, sleepTime: e.target.valueAsNumber })
          }
        ></input>
        &nbsp;&nbsp;
      </div>
      <div className="cyb-checkbox-label">
        <h2>Default Search Depth&nbsp;&nbsp;</h2>
        <input
          type="number"
          name="text"
          className="input-depth"
          defaultValue={settings.defaultSearchDepth}
          onChange={(e) =>
            setSettings({
              ...settings,
              defaultSearchDepth: e.target.valueAsNumber,
            })
          }
        ></input>
        &nbsp;&nbsp;
      </div>
      <div className="cyb-checkbox-label">
        Merge Method
        <FilterToggleButton
          label={"Normal"}
          selected={settings.mergeMethod === "Normal"}
          onChange={() => {
            if (settings.mergeMethod === "Fit") {
              setSettings({ ...settings, mergeMethod: "Normal" });
            }
          }}
        />
        <FilterToggleButton
          label={"Fit"}
          selected={settings.mergeMethod === "Fit"}
          onChange={() => {
            if (settings.mergeMethod === "Normal") {
              setSettings({ ...settings, mergeMethod: "Fit" });
            }
          }}
        />
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
          onClick={() =>
            window.do.selectFolder().then((result) => {
              if (result) {
                setSettings({ ...settings, downloadPath: result });
              }
            })
          }
        >
          <span className="text-2">Browse</span>
        </span>
      </div>
    </div>
  );
}

import { open } from "@tauri-apps/api/dialog";
import { FilterToggleButton } from "../components";
import { useSettings, useSetSettings } from "../ShellerProvider";

export default function Settings({ downloading, dispatch }) {
  const [settings, setSettings] = [useSettings(), useSetSettings()];
  const changeFilePath = async () => {
    const path = await open({
      directory: true,
    });
    if (path) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        download_path: path,
      }));
    }
  };
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
              checked={settings.auto_merge}
              onChange={() =>
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  auto_merge: !prevSettings.auto_merge,
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
              checked={settings.auto_convert}
              onChange={() =>
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  auto_convert: !prevSettings.auto_convert,
                }))
              }
            ></input>
          </label>
        </div>
        <div className="cyb-checkbox-label">
          Merge Method:&nbsp;
          <FilterToggleButton
            label={"Normal"}
            selected={settings.merge_method === "Normal"}
            onChange={() => {
              if (settings.merge_method === "Fit") {
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  merge_method: "Normal",
                }));
              }
            }}
          />
          <FilterToggleButton
            label={"Fit"}
            selected={settings.merge_method === "Fit"}
            onChange={() => {
              if (settings.merge_method === "Normal") {
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  merge_method: "Fit",
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
              checked={settings.load_covers}
              onChange={() =>
                setSettings((prevSettings) => ({
                  ...prevSettings,
                  load_covers: !prevSettings.load_covers,
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
            defaultValue={settings.sleep_time}
            onChange={(e) =>
              e.target.valueAsNumber > 0 &&
              setSettings((prevSettings) => ({
                ...prevSettings,
                sleep_time: e.target.valueAsNumber,
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
            defaultValue={settings.default_search_depth}
            onChange={(e) =>
              e.target.valueAsNumber > 0 &&
              setSettings((prevSettings) => ({
                ...prevSettings,
                default_search_depth: e.target.valueAsNumber,
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
          value={settings.download_path}
          readOnly
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
            changeFilePath();
          }}
        >
          <span className="text-2">Browse</span>
        </span>
      </div>
    </div>
  );
}

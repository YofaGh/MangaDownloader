import { chooseFolder } from "../utils";
import { FilterToggleButton, CheckBox } from "../components";
import {
  useSettingsStore,
  useDownloadingStore,
  useNotificationStore,
} from "../store";

export default function Settings() {
  const { downloading } = useDownloadingStore();
  const { settings, updateSettings } = useSettingsStore();
  const notifyError = useNotificationStore((state) => state.notifyError);

  const changeFilePath = async () => {
    if (downloading) {
      notifyError("There's a download in progress. Stop it first.");
      return;
    }
    const download_path = await chooseFolder();
    if (download_path) updateSettings({ download_path });
  };

  return (
    <div className="container">
      <div className="f-header">Settings</div>
      <div className="s-utils">
        <div className="in-depth">
          <CheckBox
            label="Auto Merge:"
            checked={settings.auto_merge}
            onChange={(e) => updateSettings({ auto_merge: e.target.checked })}
          />
        </div>
        <div className="in-depth">
          <CheckBox
            label="Auto Convert To PDF:"
            checked={settings.auto_convert}
            onChange={(e) => updateSettings({ auto_convert: e.target.checked })}
          />
        </div>
        <div className="cyb-checkbox-label">
          Merge Method:&nbsp;
          <FilterToggleButton
            label="Normal"
            selected={settings.merge_method === "Normal"}
            onChange={() =>
              settings.merge_method === "Fit" &&
              updateSettings({ merge_method: "Normal" })
            }
          />
          <FilterToggleButton
            label="Fit"
            selected={settings.merge_method === "Fit"}
            onChange={() =>
              settings.merge_method === "Normal" &&
              updateSettings({ merge_method: "Fit" })
            }
          />
        </div>
      </div>
      <div className="s-utils">
        <div className="in-depth">
          <CheckBox
            label="Load Covers:"
            checked={settings.load_covers}
            onChange={(e) => updateSettings({ load_covers: e.target.checked })}
          />
        </div>
        <div className="cyb-checkbox-label">
          Sleep Time:&nbsp;&nbsp;
          <input
            name="text"
            type="number"
            className="input-depth"
            defaultValue={settings.sleep_time}
            onChange={(e) =>
              e.target.valueAsNumber > 0 &&
              updateSettings({ sleep_time: e.target.valueAsNumber })
            }
          ></input>
          &nbsp;&nbsp;
        </div>
        <div className="cyb-checkbox-label">
          Default Search Depth: &nbsp;&nbsp;
          <input
            name="text"
            type="number"
            className="input-depth"
            defaultValue={settings.default_search_depth}
            onChange={(e) =>
              e.target.valueAsNumber > 0 &&
              updateSettings({ default_search_depth: e.target.valueAsNumber })
            }
          ></input>
          &nbsp;&nbsp;
        </div>
      </div>
      <div className="cyb-checkbox-label">
        Download Path:&nbsp;
        <input
          readOnly
          name="text"
          type="text"
          className="input"
          value={settings.download_path}
        ></input>
        <span className="playstore-button texts" onClick={changeFilePath}>
          <span className="text-2">Browse</span>
        </span>
      </div>
    </div>
  );
}

import { FilterToggleButton, CheckBox } from "../components";
import {
  useSettingsStore,
  useNotificationStore,
  useDownloadingStore,
} from "../store";
import { chooseFolder } from "../utils";

export default function Settings() {
  const { settings, updateSettings } = useSettingsStore();
  const { addErrorNotification } = useNotificationStore();
  const { downloading } = useDownloadingStore();

  const changeFilePath = async () => {
    if (downloading) {
      addErrorNotification("There's a download in progress. Stop it first.");
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
            onChange={() =>
              updateSettings({ auto_merge: !settings.auto_merge })
            }
          />
        </div>
        <div className="in-depth">
          <CheckBox
            label="Auto Convert To PDF:"
            checked={settings.auto_convert}
            onChange={() =>
              updateSettings({ auto_convert: !settings.auto_convert })
            }
          />
        </div>
        <div className="cyb-checkbox-label">
          Merge Method:&nbsp;
          <FilterToggleButton
            label="Normal"
            selected={settings.merge_method === "Normal"}
            onChange={() => {
              if (settings.merge_method === "Fit")
                updateSettings({ merge_method: "Normal" });
            }}
          />
          <FilterToggleButton
            label="Fit"
            selected={settings.merge_method === "Fit"}
            onChange={() => {
              if (settings.merge_method === "Normal")
                updateSettings({ merge_method: "Fit" });
            }}
          />
        </div>
      </div>
      <div className="s-utils">
        <div className="in-depth">
          <CheckBox
            label="Load Covers:"
            checked={settings.load_covers}
            onChange={() =>
              updateSettings({ load_covers: !settings.load_covers })
            }
          />
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
              updateSettings({ sleep_time: e.target.valueAsNumber })
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
              updateSettings({ default_search_depth: e.target.valueAsNumber })
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
        <span className="playstore-button texts" onClick={changeFilePath}>
          <span className="text-2">Browse</span>
        </span>
      </div>
    </div>
  );
}

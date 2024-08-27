import { useEffect } from "react";
import {
  SearchBar,
  ExpandButton,
  SaucerResult,
  Loading,
  isUrlValid,
  StepsCircle,
  PushButton,
} from "../components";
import {
  useSettingsStore,
  useNotificationStore,
  useSauceStore,
} from "../store";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export default function Saucer() {
  const {
    sauceStatus,
    sauceUrl,
    sauceResults,
    saucers,
    setSauceStatus,
    setSauceUrl,
    addSauceResult,
    setSaucers,
    clearSauce,
  } = useSauceStore();
  const { addSuccessNotification, addErrorNotification } = useNotificationStore();
  const { load_covers } = useSettingsStore((state) => state.settings);

  useEffect(() => {
    if (saucers.length === 0) {
      (async () => {
        const response = await invoke("get_saucers_list");
        setSaucers(response);
      })();
    }
  }, [saucers.length, setSaucers]);

  const uploadImage = async () => {
    const path = await open({
      directory: false,
      multiple: false,
    });
    setSauceStatus("Uploading");
    const response = await invoke("upload_image", { path: path.path });
    setSauceUrl(response);
    addSuccessNotification(`Uploaded ${response}`);
    setSauceStatus(null);
  };

  useEffect(() => {
    const startSaucer = async () => {
      if (!isUrlValid(sauceUrl)) {
        addErrorNotification("Invalid URL");
        setSauceStatus(null);
        return;
      }
      for (let i = 0; i < saucers.length; i++) {
        const site = saucers[i];
        let element = document.getElementById(site);
        element.classList.add("active");
        const res = await invoke("sauce", { saucer: site, url: sauceUrl });
        addSauceResult(res.map((item) => ({ site, ...item })));
        element.classList.remove("active");
        element.classList.remove("done");
        document.querySelector(".steps-indicator").style.width =
          (i + 1) * 120 + "px";
      }
      addSuccessNotification("Sauced");
      setSauceStatus("Sauced");
    };

    if (sauceStatus === "Saucing") {
      startSaucer();
    }
  }, [sauceStatus]);

  if (sauceStatus === "Sauced") {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Results</h2>
          <PushButton label="Reset" onClick={clearSauce} />
        </div>
        <div className="ff-container">
          {sauceResults.map((result) => (
            <SaucerResult
              key={result.url}
              result={result}
              load_covers={load_covers}
            />
          ))}
        </div>
      </div>
    );
  } else if (sauceStatus === "Saucing") {
    return (
      <div className="container">
        <div className="f-header">Saucing...</div>
        <StepsCircle
          circles={saucers.map((site) => ({
            id: site,
            name: site[0].toUpperCase() + site.slice(1),
          }))}
          preClassName=""
          hasProgressBar={true}
        />
      </div>
    );
  } else if (sauceStatus === "Uploading") {
    return (
      <div className="container">
        <Loading />
        <p>Uploading...</p>
      </div>
    );
  } else {
    return (
      <div className="container">
        <div style={{ display: "inline-flex" }}>
          <SearchBar
            input={sauceUrl}
            setInput={setSauceUrl}
            placeHolder="Enter image url"
          />
          <ExpandButton
            name="search"
            dimension={20}
            onClick={() => setSauceStatus("Saucing")}
          />
        </div>
        <p>Or</p>
        <div className="locate-container">
          <div className="locate-header">
            <label htmlFor="file" onClick={uploadImage}>
              <img
                alt=""
                src="./assets/upload.svg"
                className="buttonh icon"
                style={{ width: "70px", height: "70px" }}
              ></img>
            </label>
            <p>Upload An Image</p>
          </div>
        </div>
      </div>
    );
  }
}

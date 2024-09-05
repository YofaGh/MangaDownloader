import { useEffect, useState } from "react";
import { saucer } from "../operators";
import { useNotificationStore, useSauceStore } from "../store";
import { getSaucersList, uploadImage, chooseFile } from "../utils";
import {
  SearchBar,
  ExpandButton,
  SaucerResult,
  Loading,
  StepsCircle,
  PushButton,
  Icon,
} from "../components";

export default function Saucer() {
  const {
    sauceStatus,
    sauceUrl,
    sauceResults,
    saucers,
    setSauceStatus,
    setSauceUrl,
    setSaucers,
    clearSauce,
  } = useSauceStore();
  const { addSuccessNotification } = useNotificationStore();
  const [stepStatuses, setStepStatuses] = useState([]);

  useEffect(() => {
    if (saucers.length === 0) {
      (async () => setSaucers(await getSaucersList()))();
      setStepStatuses(new Array(saucers.length).fill(""));
    }
  }, [saucers.length, setSaucers]);

  const updateStepStatus = (stepIndex, status) => {
    setStepStatuses((prev) => {
      const newStatuses = [...prev];
      newStatuses[stepIndex] = status;
      return newStatuses;
    });
  };

  const upload = async () => {
    const path = await chooseFile();
    if (!path) return;
    setSauceStatus("Uploading");
    const response = await uploadImage(path);
    setSauceUrl(response);
    addSuccessNotification(`Uploaded ${response}`);
    setSauceStatus(null);
  };

  useEffect(() => {
    if (sauceStatus === "Saucing") saucer(updateStepStatus);
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
            <SaucerResult key={result.url} result={result} />
          ))}
        </div>
      </div>
    );
  } else if (sauceStatus === "Saucing") {
    return (
      <div className="container">
        <div className="f-header">Saucing...</div>
        <StepsCircle
          circles={saucers.map((site) => site[0].toUpperCase() + site.slice(1))}
          stepStatuses={stepStatuses}
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
            <label htmlFor="file" onClick={upload}>
              <Icon
                svgName="upload"
                className="buttonh icon"
                style={{ width: "70px", height: "70px" }}
              />
            </label>
            <p>Upload An Image</p>
          </div>
        </div>
      </div>
    );
  }
}

import React, { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import SaucerResult from "../components/SaucerResult";
import Loading from "../components/Loading";
import { useNotification } from "../NotificationProvider";
import { useSheller } from "../ShellerProvider";
import "../styles/Saucer.css";

export default function Saucer({ loadCovers }) {
  const [url, setUrl] = useState("");
  const [sites, setSites] = useState([]);
  const [results, setResults] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const dispatch = useNotification();
  const sheller = useSheller();

  useEffect(() => {
    const fetchSaucers = async () => {
      const response = await sheller(["get_saucers_list"]);
      setSites(response);
    };
    fetchSaucers();
  }, []);

  const setFile = async (e) => {
    setCurrentStatus("Uploading");
    const response = await sheller(["upload_image", e.target.files[0].path]);
    setUrl(response);
    dispatch({
      type: "SUCCESS",
      message: `Uploaded ${e.target.files[0].name}`,
      title: "Successful Request",
    });
    setCurrentStatus(null);
  };

  useEffect(() => {
    const startSaucer = async () => {
      if (!url) {
        return;
      }
      setCurrentStatus("Saucing");
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        let element = document.getElementById(site);
        element.classList.add("active");
        const res = await sheller(["saucer", site, url]);
        setResults((prevResults) => [
          ...prevResults,
          ...res.map((item) => ({ site, ...item })),
        ]);
        element.classList.remove("active");
        element.classList.add("done");
        let progressBar = document.querySelector(".steps-indicator");
        progressBar.style.width = (i + 1) * 120 + "px";
      }
      setCurrentStatus("Sauced");
    };

    if (currentStatus === "Saucing") {
      startSaucer();
    }
  }, [currentStatus, sites]);

  if (currentStatus === "Sauced") {
    return (
      <div className="container">
        <div className="f-header">Results</div>
        <div className="ff-container">
          {results.map((result) => (
            <SaucerResult
              key={result.url}
              result={result}
              loadCovers={loadCovers}
            />
          ))}
        </div>
      </div>
    );
  } else if (currentStatus === "Saucing") {
    return (
      <div className="container">
        <div className="f-header">Saucing...</div>
        <div className="steps-container">
          <div className="steps">
            {sites.map((site) => {
              return (
                <span className="steps-circle" key={site} id={site}>
                  {site[0].toUpperCase() + site.slice(1)}
                </span>
              );
            })}
            <div className="steps-progress-bar">
              <span className="steps-indicator"></span>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (currentStatus === "Uploading") {
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
            input={url}
            setInput={setUrl}
            placeHolder={"Enter image url"}
          />
          <button
            className="m-button search-btn"
            onClick={() => setCurrentStatus("Saucing")}
          >
            <img
              alt=""
              src="./assets/search.svg"
              className="btn-icon"
              style={{ width: "20px", height: "20px" }}
            ></img>
          </button>
        </div>
        <p>Or</p>
        <div className="locate-container">
          <div className="locate-header">
            <label htmlFor="file">
              <img
                alt=""
                src={"./assets/upload.svg"}
                className="buttonh icon"
                style={{ width: "70px", height: "70px" }}
              ></img>
            </label>
            <p>Upload An Image</p>
          </div>
          <input id="file" type="file" onChange={setFile}></input>
        </div>
      </div>
    );
  }
}

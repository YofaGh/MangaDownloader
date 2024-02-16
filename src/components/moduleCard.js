import React, { useState } from "react";
import "./../App.css";
import "../styles/moduleCard.css";
import { Link } from "react-router-dom";
import { useSheller } from "../ShellerProvider";

export default function MCard({ module, checkModule, loadCovers }) {
  const sheller = useSheller();
  const [imageSrc, setImageSrc] = useState(
    loadCovers && module.logo ? module.logo : "./assets/module-cyan.svg"
  );
  const get_cover = async () => {
    try {
      const response = await sheller([
        "retrieve_image",
        module.domain,
        imageSrc,
      ]);
      setImageSrc(response);
    } catch (error) {
      setImageSrc("./assets/module-cyan.svg");
    }
  };
  return (
    <div className="m-card">
      <div className="m-card-info">
        <div className="m-title">
          <div className="m-label">{module.type}</div>
          <div className="m-logo">
            <img
              referrerPolicy="no-referrer"
              src={imageSrc}
              loading="lazy"
              alt=""
              style={{ width: 70, height: 70 }}
              onError={get_cover}
            />
          </div>
          <div className="m-name">{module.domain}</div>
          <div className="button-container">
            <Link to={`/${module.domain}`} state={{ module }}>
              <button className="m-button search-btn">
                <img
                  alt=""
                  src="./assets/search.svg"
                  className="btn-icon"
                  style={{ width: 30, height: 30 }}
                ></img>
              </button>
            </Link>
            <button
              className="m-button check-btn"
              onClick={() => checkModule(module)}
            >
              <img
                alt=""
                src="./assets/check.svg"
                className="btn-icon"
                style={{ width: 30, height: 30 }}
              ></img>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

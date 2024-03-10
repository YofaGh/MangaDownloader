import { useState } from "react";
import { Link } from "react-router-dom";
import { retrieveImage } from ".";
import { useSheller } from "../Provider";

export default function MCard({ module, checkModule, load_covers }) {
  const sheller = useSheller();
  const [imageSrc, setImageSrc] = useState(
    load_covers && module.logo ? module.logo : "./assets/module-cyan.svg"
  );

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
              onError={() => {
                retrieveImage(
                  imageSrc,
                  module.domain,
                  setImageSrc,
                  sheller,
                  "./assets/module-cyan.svg"
                );
              }}
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

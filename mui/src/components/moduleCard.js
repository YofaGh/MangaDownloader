import React, { useState, useEffect } from "react";
import "./../App.css";
import get_logo from "../api/get_logo";
import "./moduleCard.css";
import { Link } from "react-router-dom";

function MCard({ module }) {
  const [logo_url, setLogoUrl] = useState([]);
  const fetchLogo = async () => {
    const response = await get_logo(module.domain);
    setLogoUrl(response);
  };

  useEffect(() => {
    fetchLogo();
  });

  return (
    <div className="m-card">
      <div className="m-card-info">
        <div className="m-title">
          <div className="m-label">{module.type}</div>
          <div className="m-logo">
            <img
              referrerPolicy="no-referrer"
              src={logo_url ? logo_url : "./assets/module.png"}
              loading="lazy"
              alt=""
              style={{ idth: 70, height: 70 }}
            />
          </div>
          <div className="m-name">{module.domain}</div>
          <div className="button-container">
            <Link to={`/${module.domain}`}>
              <button className="m-button search-btn">
                <img
                  alt=""
                  src="./assets/search.svg"
                  className="btn-icon"
                ></img>
              </button>
            </Link>
            <button className="m-button check-btn">
              <img alt="" src="./assets/check.svg" className="btn-icon"></img>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MCard;

import React from "react";
import "./../App.css";
import "../styles/moduleCard.css";
import { Link } from "react-router-dom";

function MCard({ module }) {
  return (
    <div className="m-card">
      <div className="m-card-info">
        <div className="m-title">
          <div className="m-label">{module.type}</div>
          <div className="m-logo">
            <img
              referrerPolicy="no-referrer"
              src={module.logo ? module.logo : "./assets/module.png"}
              loading="lazy"
              alt=""
              style={{ width: 70, height: 70 }}
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
                  style={{ width: 30, height: 30 }}
                ></img>
              </button>
            </Link>
            <button className="m-button check-btn">
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

export default MCard;

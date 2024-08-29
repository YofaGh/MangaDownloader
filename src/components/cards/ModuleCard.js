import { useState } from "react";
import { Link } from "react-router-dom";
import { ExpandButton } from "..";
import { retrieveImage } from "../../utils";

export default function MCard({ module, checkModule, load_covers }) {
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
              onError={() =>
                retrieveImage(
                  imageSrc,
                  module.domain,
                  setImageSrc,
                  "./assets/module-cyan.svg"
                )
              }
            />
          </div>
          <div className="m-name">{module.domain}</div>
          <div className="button-container">
            <Link to={`/${module.domain}`} state={{ module }}>
              <ExpandButton name="search" dimension={30} />
            </Link>
            <ExpandButton
              name="check"
              dimension={30}
              onClick={() => checkModule(module)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

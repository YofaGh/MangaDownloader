import { Link } from "react-router-dom";
import { ExpandButton, Image } from "..";
import { moduleChecker } from "../../operators";
import { DefaultModuleCover } from "../../utils";

export default function MCard({ module, setStepStatuses, setModuleToCheck }) {
  return (
    <div className="m-card">
      <div className="m-card-info">
        <div className="m-title">
          <div className="m-label">{module.type}</div>
          <div className="m-logo">
            <Image
              referrerPolicy="no-referrer"
              src={module.logo}
              loading="lazy"
              style={{ width: 70, height: 70 }}
              domain={module.domain}
              defImage={DefaultModuleCover}
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
              onClick={() => {
                setModuleToCheck(module);
                moduleChecker(module, setStepStatuses);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

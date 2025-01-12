import { Icon } from "../components";
import { openUrl } from "../utils";

export default function About() {
  const github = "https://github.com/YofaGh";
  const linkedin = "https://www.linkedin.com/in/yousef-ghadiri-795b74242";
  return (
    <div className="container">
      <div className="f-header">Developed By YofaGh for my fellow Otakus:)</div>
      <div>
        <div className="a-card">
          <span className="social-link" onClick={() => openUrl(github)}>
            <Icon svgName="github" className="a-img" />
          </span>
          <span className="social-link" onClick={() => openUrl(linkedin)}>
            <Icon svgName="linkedin" className="a-img" />
          </span>
        </div>
      </div>
    </div>
  );
}

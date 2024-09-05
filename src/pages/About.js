import { Icon } from "../components";

export default function About() {
  return (
    <div className="container">
      <div className="f-header">Developed By YofaGh for my fellow Otakus:)</div>
      <div>
        <div className="a-card">
          <a
            className="social-link"
            href="https://github.com/YofaGh"
            target="_blank"
            rel="noreferrer"
          >
            <Icon svgName="github" className="a-img" />
          </a>
          <a
            className="social-link"
            href="https://www.linkedin.com/in/yousef-ghadiri-795b74242"
            target="_blank"
            rel="noreferrer"
          >
            <Icon svgName="linkedin" className="a-img" />
          </a>
        </div>
      </div>
    </div>
  );
}

import "../styles/About.css";

export default function About() {
  return (
    <div className="container">
      <div className="f-header">Developed By YofaGh for my fellow otakus:)</div>
      <div>
        <div class="a-card">
          <a class="social-link" href="https://github.com/YofaGh" target="_blank" rel="noreferrer">
            <img alt="" src="./assets/github.svg" className="a-img"></img>
          </a>
          <a class="social-link" href="https://www.linkedin.com/in/yousef-ghadiri-795b74242" target="_blank" rel="noreferrer">
            <img alt="" src="./assets/linkedin.svg" className="a-img"></img>
          </a>
        </div>
      </div>
    </div>
  );
}

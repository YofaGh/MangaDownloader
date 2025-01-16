import { Link } from "react-router-dom";
import { Icon } from "..";

export default function HomeButton({ label, svgName }) {
  return (
    <Link to={{ pathname: label }}>
      <button className="playstore-button">
        <Icon svgName={svgName} className="iconn" />
        <span className="texts">
          <span className="text-2">{label}</span>
        </span>
      </button>
    </Link>
  );
}

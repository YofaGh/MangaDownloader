import { Icon } from "..";

export default function HomeButton({ label, svgName, onClick }) {
  return (
    <button className="playstore-button" onClick={onClick}>
      <Icon svgName={svgName} className="iconn" />
      <span className="texts">
        <span className="text-2">{label}</span>
      </span>
    </button>
  );
}

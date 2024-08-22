export default function HomeButton({ label, svgName, onClick }) {
  return (
    <button className="playstore-button" onClick={onClick ? onClick : null}>
      <img alt="" src={`./assets/${svgName}.svg`} className="iconn"></img>
      <span className="texts">
        <span className="text-2">{label}</span>
      </span>
    </button>
  );
}

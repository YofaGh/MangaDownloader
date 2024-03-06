export default function HomeButton({ label, svg, onClick }) {
  return (
    <button className="playstore-button" onClick={onClick ? onClick : null}>
      <img alt="" src={svg} className="iconn"></img>
      <span className="texts">
        <span className="text-2">{label}</span>
      </span>
    </button>
  );
}

import "../styles/HomeButton.css";

export default function HomeButton({ label, svg, onClick }) {
  return (
    <button class="playstore-button" onClick={onClick ? onClick : null}>
      <img alt="" src={svg} className="iconn"></img>
      <span class="texts">
        <span class="text-2">{label}</span>
      </span>
    </button>
  );
}

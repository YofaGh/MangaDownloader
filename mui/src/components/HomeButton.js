import "../styles/HomeButton.css";

export default function HomeButton({ label, svg }) {
  return (
    <button class="playstore-button">
      <img alt="" src={svg} className="iconn"></img>
      <span class="texts">
        <span class="text-2">{label}</span>
      </span>
    </button>
  );
}

import "../styles/CrushedButtton.css";

export default function CrushedButtton({ label, onClick }) {
  return (
    <div>
      <button className="crushed-button" onClick={onClick}>
        <p className="crushed-button-text">{label}</p>
      </button>
    </div>
  );
}

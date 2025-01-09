export default function PushButton({ label, onClick }) {
  return (
    <button className="pb-button" onClick={onClick}>
      {label}
    </button>
  );
}

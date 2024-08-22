export default function DownloadButton({ label, onClick }) {
  return (
    <button className="btnn" onClick={onClick}>
      <span>{label}</span>
      <div className="top"></div>
      <div className="left"></div>
      <div className="bottom"></div>
      <div className="right"></div>
    </button>
  );
}

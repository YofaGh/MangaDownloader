export default function ExpandButton({ name, onClick, dimension }) {
  return (
    <button className={`m-button ${name}-btn`} onClick={onClick || (() => {})}>
      <img
        alt=""
        src={`./assets/${name}.svg`}
        className="btn-icon"
        style={{ width: dimension, height: dimension }}
      ></img>
    </button>
  );
}

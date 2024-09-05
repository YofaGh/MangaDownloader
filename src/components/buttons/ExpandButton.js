import { Icon } from "..";

export default function ExpandButton({ name, onClick, dimension }) {
  return (
    <button className={`m-button ${name}-btn`} onClick={onClick || (() => {})}>
      <Icon
        svgName={name}
        className="btn-icon"
        style={{ width: dimension, height: dimension }}
      />
    </button>
  );
}

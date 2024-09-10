import { Icon } from "..";

export default function ActionButton({
  onClick,
  svgName,
  tooltip,
  icnClassName,
}) {
  return (
    <button className="buttonh" onClick={onClick}>
      <Icon svgName={svgName} className={icnClassName} />
      <span className="tooltip">{tooltip}</span>
    </button>
  );
}

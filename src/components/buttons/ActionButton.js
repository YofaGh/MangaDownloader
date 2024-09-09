import { Icon } from "..";

export default function ActionButton({
  onClick,
  svgName,
  tooltip,
  btnClassName,
  icnClassName,
}) {
  return (
    <button className={btnClassName || "buttonh"} onClick={onClick}>
      <Icon svgName={svgName} className={icnClassName} />
      <span className="tooltip">{tooltip}</span>
    </button>
  );
}

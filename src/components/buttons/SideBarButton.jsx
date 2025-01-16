import { Link } from "react-router-dom";
import { Icon } from "..";

export default function SideBarButton({ svgName, pathName, className, style }) {
  pathName = pathName || svgName;
  className = className || "buttonh";
  return (
    <Link to={{ pathname: pathName }} style={style}>
      <button className={className}>
        <Icon svgName={svgName} />
      </button>
    </Link>
  );
}

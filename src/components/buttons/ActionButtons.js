import { Icon } from "..";

export const ActionButtonBig = ({ onClick, svgName, tooltip }) => (
  <button className="buttong" onClick={onClick}>
    <Icon svgName={svgName} />
    <span className="tooltip">{tooltip}</span>
  </button>
);

export const ActionButtonSmall = ({ onClick, svgName, tooltip }) => (
  <button className="buttonh" onClick={onClick}>
    <Icon svgName={svgName} />
    <span className="tooltip">{tooltip}</span>
  </button>
);

export const ActionButtonCustom = ({ onClick, svgName, tooltip }) => (
  <button className="buttonh" onClick={onClick}>
    <Icon svgName={svgName} className="icofn" />
    <span className="tooltip">{tooltip}</span>
  </button>
);

export const ActionButtonBig = ({ onClick, svgName, tooltip }) => (
  <button className="buttong" onClick={onClick}>
    <img alt="" src={`./assets/${svgName}.svg`} className="icon"></img>
    <span className="tooltip">{tooltip}</span>
  </button>
);

export const ActionButtonSmall = ({ onClick, svgName, tooltip }) => (
  <button className="buttonh" onClick={onClick}>
    <img alt="" src={`./assets/${svgName}.svg`} className="icon"></img>
    <span className="tooltip">{tooltip}</span>
  </button>
);

export const ActionButtonCustom = ({ onClick, svgName, tooltip }) => (
  <button className="buttonh" onClick={onClick}>
    <img alt="" src={`./assets/${svgName}.svg`} className="icofn"></img>
    <span className="tooltip">{tooltip}</span>
  </button>
);

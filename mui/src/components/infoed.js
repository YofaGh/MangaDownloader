import "./infoed.css";

const Infoed = ({ title, info }) => {
  function isEmpty(input) {
    switch (typeof input) {
      case "undefined":
        return true;
      case "string":
      case "object":
        return Object.keys(input).length === 0;
      case "boolean":
      case "bigint":
      case "number":
        return input === 0;
      default:
        return true;
    }
  }
  return isEmpty(info) ? (
    <></>
  ) : (
    <div>
      <div className="title-info">{title} </div>
      {typeof info === "object" ? (
        info.map((minfo) => (
          <button className="cssbuttons-io">
            <span>{minfo} </span>
          </button>
        ))
      ) : (
        <button className="cssbuttons-io">
          <span>{info} </span>
        </button>
      )}
    </div>
  );
};

export default Infoed;

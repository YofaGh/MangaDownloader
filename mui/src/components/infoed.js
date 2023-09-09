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
      {title}{" "}
      {typeof info === "object" ? (
        info.map((minfo) => <span>{minfo} </span>)
      ) : (
        <span>{info}</span>
      )}
    </div>
  );
};

export default Infoed;

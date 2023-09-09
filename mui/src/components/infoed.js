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
      {title} {info}
    </div>
  );
};

export default Infoed;

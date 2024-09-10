export default function Infoed({ title, info }) {
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
          <div key={minfo} className="display-inline-flex">
            <button className="cssbuttons-io">
              <span>{minfo} </span>
            </button>
          </div>
        ))
      ) : (
        <button className="cssbuttons-io">
          <span>{info} </span>
        </button>
      )}
    </div>
  );
}

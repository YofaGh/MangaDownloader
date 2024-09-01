export default function Rating({ rating }) {
  return (
    <div>
      {rating}
      <span
        className="fa fa-star checked rate"
        style={{ marginTop: "3px" }}
      ></span>
    </div>
  );
}

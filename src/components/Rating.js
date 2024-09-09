export default function Rating({ rating }) {
  return (
    <div>
      {rating}
      <span
        style={{ marginTop: "3px" }}
        className="fa fa-star checked rate"
      ></span>
    </div>
  );
}

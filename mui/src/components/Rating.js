export default function Rating({ webtoon }) {
  return (
    <div>
      {webtoon.Rating}
      <span
        className="fa fa-star checked rate"
        style={{ marginTop: "3px" }}
      ></span>
    </div>
  );
}

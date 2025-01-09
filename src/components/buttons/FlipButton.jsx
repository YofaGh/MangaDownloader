export default function FlipButton({ label, datetime }) {
  const date = new Date(datetime);
  const dateJ = `${date.getFullYear()}/${
    date.getMonth() + 1
  }/${date.getDate()}`;
  const dateTime = `${dateJ} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

  return (
    <div className="scene">
      <div className="cube">
        <span className="side topp">{dateTime}</span>
        <span className="side frontt">
          <div>
            {label}
            <br />
            {dateJ}
          </div>
        </span>
      </div>
    </div>
  );
}

export default function StepsCircle({ circles, stepStatuses, hasProgressBar }) {
  const progress =
    (stepStatuses.filter((status) => status !== "").length / circles.length) *
    100;

  return (
    <div className="steps-container">
      <div className="steps">
        {circles.map((name, index) => (
          <span key={name} className={`steps-circle ${stepStatuses[index]}`}>
            {name}
          </span>
        ))}
        {hasProgressBar && (
          <div className="steps-progress-bar">
            <span
              style={{ width: `${progress}%` }}
              className="steps-indicator"
            ></span>
          </div>
        )}
      </div>
    </div>
  );
}

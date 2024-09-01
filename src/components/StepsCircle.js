export default function StepsCircle({
  circles,
  stepStatuses,
  preClassName,
  hasProgressBar,
}) {
  preClassName = preClassName || "";
  const progress =
    (stepStatuses.filter((status) => status !== "").length / circles.length) *
    100;

  return (
    <div className={`${preClassName}steps-container`}>
      <div className={`${preClassName}steps`}>
        {circles.map((name, index) => (
          <span
            className={`${preClassName}steps-circle ${stepStatuses[index]}`}
            key={name}
          >
            {name}
          </span>
        ))}
        {hasProgressBar && (
          <div className={`${preClassName}steps-progress-bar`}>
            <span
              className={`${preClassName}steps-indicator`}
              style={{ width: `${progress}%` }}
            ></span>
          </div>
        )}
      </div>
    </div>
  );
}

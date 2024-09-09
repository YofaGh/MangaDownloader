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
            key={name}
            className={`${preClassName}steps-circle ${stepStatuses[index]}`}
          >
            {name}
          </span>
        ))}
        {hasProgressBar && (
          <div className={`${preClassName}steps-progress-bar`}>
            <span
              style={{ width: `${progress}%` }}
              className={`${preClassName}steps-indicator`}
            ></span>
          </div>
        )}
      </div>
    </div>
  );
}

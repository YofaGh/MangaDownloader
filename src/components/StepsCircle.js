export default function StepsCircle({ circles, preClassName, hasProgressBar }) {
  return (
    <div className={`${preClassName}steps-container`}>
      <div className={`${preClassName}steps`}>
        {circles.map((circle) => {
          return (
            <span
              className={`${preClassName}steps-circle`}
              key={circle.id}
              id={circle.id}
            >
              {circle.name}
            </span>
          );
        })}
        {hasProgressBar && (
          <div className={`${preClassName}steps-progress-bar`}>
            <span className={`${preClassName}steps-indicator`}></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StepsCircle({ circles, preClassName, hasProgressBar }) {
  preClassName = preClassName || "";

  return (
    <div className={`${preClassName}steps-container`}>
      <div className={`${preClassName}steps`}>
        {circles.map(({ id, name }) => (
          <span className={`${preClassName}steps-circle`} key={id} id={id}>
            {name}
          </span>
        ))}
        {hasProgressBar && (
          <div className={`${preClassName}steps-progress-bar`}>
            <span className={`${preClassName}steps-indicator`}></span>
          </div>
        )}
      </div>
    </div>
  );
}

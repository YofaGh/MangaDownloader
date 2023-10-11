import "../styles/FlipButton.css"

const FlipButton = ({frontText, backText}) => {
  return (
    <div className="scene">
      <div className="cube">
        <span className="side topp">{backText}</span>
        <span className="side frontt">{frontText}</span>
      </div>
    </div>
  );
};

export default FlipButton;
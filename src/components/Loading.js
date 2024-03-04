import "../styles/loading.css";

export default function Loading() {
  return (
    <div className="loading">
      <div className="spinner-container">
        <div className="spinner">
          <div className="spinner">
            <div className="spinner">
              <div className="spinner">
                <div className="spinner"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

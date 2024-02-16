import React from "react";
import "../styles/FilterButton.css";

export default function FilterButton({ label, selected, loading }) {
  const className = selected ? "filter-toggleee filter-selected-color" : "filter-toggleee filter-color";

  return (
    <div className={className}>
      <span>{label}</span>
      {loading && <div className="spinnerrr"></div>}
    </div>
  );
}

import React from "react";
import "../styles/FilterToggleButton.css";

export default function FilterToggleButton({ label, selected, onChange }) {
  return (
    <div className="filter-toggle">
      <input type="checkbox" id={label} className="nio" checked={selected ? true : false} onChange={onChange}></input>
      <label htmlFor={label} className="ni">{label}</label>
    </div>
  );
}

export default function FilterToggleButton({ label, selected, onChange }) {
  return (
    <div className="filter-toggle">
      <input
        id={label}
        type="checkbox"
        className="nio"
        checked={selected}
        onChange={onChange}
      ></input>
      <label htmlFor={label} className="ni">
        {label}
      </label>
    </div>
  );
}

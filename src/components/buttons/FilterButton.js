export default function FilterButton({ label, selected, loading }) {
  return (
    <div
      className={`filter-toggleee filter${selected ? "-selected" : ""}-color`}
    >
      <span>{label}</span>
      {loading && <div className="spinnerrr"></div>}
    </div>
  );
}

export default function CheckBox({ label, onChange, checked }) {
  return (
    <label className="cyb-checkbox-label">
      {label}&nbsp;
      <input
        type="checkbox"
        className="cyberpunk-checkbox"
        checked={checked}
        onChange={onChange}
      ></input>
    </label>
  );
}

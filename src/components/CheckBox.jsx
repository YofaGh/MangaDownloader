export default function CheckBox({ label, onChange, checked }) {
  return (
    <label className="cyb-checkbox-label">
      {label}&nbsp;
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="cyberpunk-checkbox"
      ></input>
    </label>
  );
}

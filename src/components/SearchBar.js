export default function SearchBar({ input, setInput, placeHolder }) {
  return (
    <input
      name="text"
      type="text"
      value={input}
      className="input"
      placeholder={placeHolder || "Type here"}
      onChange={(e) => setInput(e.target.value)}
    ></input>
  );
}

export default function SearchBar({ input, setInput, placeHolder }) {
  return (
    <input
      placeholder={placeHolder || "Type here"}
      className="input"
      name="text"
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
    ></input>
  );
}

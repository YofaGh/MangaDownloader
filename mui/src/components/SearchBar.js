import React from "react";
import "../styles/SearchBar.css";

const SearchBar = ({ input, setInput, placeHolder }) => {
  return (
    <input
      placeholder={placeHolder ? placeHolder : "Type here"}
      className="input"
      name="text"
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
    ></input>
  );
};

export default SearchBar;

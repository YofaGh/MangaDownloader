import React from "react";
import "./SearchBar.css"

const SearchBar = ({input, setInput}) => {
  return (
    <input placeholder="Type here" class="input" name="text" type="text" value={input} onChange={(e) => setInput(e.target.value)}></input>
  );
};

export default SearchBar;
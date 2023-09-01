import "./../App.css";
import React, { useState, useEffect } from "react";
import get_library from "../api/get_library";

function LPage() {
  const [library, setLibrary] = useState(null);

  useEffect(() => {
    const fetchModule = async () => {
      const response = await get_library();
      setLibrary(response);
      console.log(response)
    };

    fetchModule();
  }, []);

  return <div className="container">Library</div>;
}

export default LPage;

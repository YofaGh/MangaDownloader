import "./../App.css";
import React, { useState, useEffect } from "react";
import get_library from "../api/get_library";

function LPage() {
  const [library, setLibrary] = useState(null);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const response = await get_library();
        setLibrary(response.data);
      } catch (error) {
        console.error("Error fetching module:", error);
      }
    };

    fetchModule();
  }, [library]);

  return <div className="container">Library</div>;
}

export default LPage;

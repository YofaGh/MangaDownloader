import React from "react";
import "./../styles/SideBar.css";
import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="sidebar">
      <Link to={{ pathname: "/" }}>
        <button className="sidebar-button home"></button>
      </Link>
      <Link to={{ pathname: "library" }}>
        <button className="sidebar-button library"></button>
      </Link>
      <Link to={{ pathname: "search" }}>
        <button className="sidebar-button search"></button>
      </Link>
      <Link to={{ pathname: "modules" }}>
        <button className="sidebar-button modules"></button>
      </Link>
    </div>
  );
}

export default Sidebar;

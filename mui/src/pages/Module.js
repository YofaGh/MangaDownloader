import "./../App.css";
import React from "react";
import { useParams, } from "react-router-dom";

function Module() {
    const { module } = useParams();
    console.log(module);
  return <div className="container">{module}</div>;
}

export default Module;

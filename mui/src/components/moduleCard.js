import React, { useState, useEffect } from "react";
import "./../App.css";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import get_logo from "../api/get_logo";

function MCard({ module }) {
  const [logo_url, setLogoUrl] = useState([]);
  const fetchLogo = async () => {
    const response = await get_logo(module.domain);
    setLogoUrl(response);
  };

  useEffect(() => {
    fetchLogo();
  });
  return (
    <Card
      variant="outlined"
      orientation="horizontal"
      sx={{
        width: 200,
        "&:hover": {
          boxShadow: "md",
          borderColor: "neutral.outlinedHoverBorder",
        },
        backgroundColor: "#b1b1b1",
        textDecoration: "none",
        padding: "10px",
      }}
    >
      <img
        src={logo_url} //"./assets/fav.png"
        loading="lazy"
        alt=""
        style={{ borderRadius: "50%", width: 70, height: 70 }}
      />
      <CardContent>
        <p style={{ fontSize: 15, padding: "0px", margin: "0px" }}>
          {module.domain}
        </p>
        <Chip
          variant="outlined"
          color="primary"
          size="sm"
          sx={{ pointerEvents: "none", marginTop: "15px" }}
        >
          {module.type}
        </Chip>
      </CardContent>
    </Card>
  );
}

export default MCard;

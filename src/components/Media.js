import { useState } from "react";
import { useSettingsStore } from "../store";
import { retrieveImage, DefaultWebtoonCover } from "../utils";

export const Image = ({ src, domain, defImage, ...props }) => {
  const [triedRetrieve, setTriedRetrieve] = useState(false);
  const load_covers = useSettingsStore((state) => state.settings.load_covers);
  defImage = defImage || DefaultWebtoonCover;
  src = load_covers ? src : defImage;
  const handleError = (e) => {
    if (!triedRetrieve) {
      setTriedRetrieve(true);
      e.target.src = retrieveImage(src, domain, defImage);
    }
  };

  return (
    <img
      loading="lazy"
      referrerPolicy="no-referrer"
      alt=""
      src={src}
      onError={handleError}
      {...props}
    />
  );
};

export const Icon = ({ svgName, className, ...props }) => {
  className = className || "icon";
  return (
    <img
      alt=""
      className={className}
      src={`./assets/${svgName}.svg`}
      {...props}
    />
  );
};

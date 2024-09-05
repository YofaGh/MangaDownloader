import { useSettingsStore } from "../store";
import { retrieveImage, DefaultWebtoonCover } from "../utils";

export const Image = ({ src, domain, defImage, ...props }) => {
  const load_covers = useSettingsStore((state) => state.settings.load_covers);
  defImage = defImage || DefaultWebtoonCover;
  src = load_covers ? src : defImage;
  return (
    <img
      alt=""
      src={src}
      onError={(e) => {
        e.target.onError = null;
        e.target.src = retrieveImage(src, domain, defImage);
      }}
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

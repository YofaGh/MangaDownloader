import { useParams } from "react-router-dom";
import { WebtoonType } from "../utils";
import { useModulesStore } from "../store";
import { Manga, Doujin } from "../components";

export default function Webtoon() {
  const { module, "*": url } = useParams();
  const moduleType = useModulesStore((state) => state.modules).find(
    (m) => m.domain === module
  ).type;

  return moduleType === WebtoonType.MANGA ? (
    <Manga module={module} url={url} />
  ) : (
    <Doujin module={module} url={url} />
  );
}

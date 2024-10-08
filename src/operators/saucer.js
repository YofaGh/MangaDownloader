import { sauce, isUrlValid } from "../utils";
import { useNotificationStore, useSauceStore } from "../store";

export default async function saucer(updateStepStatus) {
  const { notifyError, notifySuccess } = useNotificationStore.getState();
  const { sauceUrl, saucers, setSauceStatus, addSauceResult } =
    useSauceStore.getState();
  if (!isUrlValid(sauceUrl)) {
    notifyError("Invalid URL");
    setSauceStatus(null);
    return;
  }
  for (let i = 0; i < saucers.length; i++) {
    updateStepStatus(i, "active");
    const site = saucers[i];
    const res = await sauce(site, sauceUrl);
    if (res && res.length > 0) updateStepStatus(i, "done");
    else updateStepStatus(i, "dead");
    addSauceResult(res.map((item) => ({ site, ...item })));
  }
  notifySuccess("Sauced");
  setSauceStatus("Sauced");
}

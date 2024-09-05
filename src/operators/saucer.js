import { sauce, isUrlValid } from "../utils";
import { useNotificationStore, useSauceStore } from "../store";

export default async function saucer(updateStepStatus) {
  const { sauceUrl, saucers, setSauceStatus, addSauceResult } =
    useSauceStore.getState();
  const { addErrorNotification, addSuccessNotification } =
    useNotificationStore.getState();
  if (!isUrlValid(sauceUrl)) {
    addErrorNotification("Invalid URL");
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
  addSuccessNotification("Sauced");
  setSauceStatus("Sauced");
};

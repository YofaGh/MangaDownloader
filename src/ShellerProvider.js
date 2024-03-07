import { createContext, useContext } from "react";
import { Command } from "@tauri-apps/api/shell";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";

const Sheller = createContext();

const ShellProvider = ({ children }) => {

  const sheller = async (args) => {
    let isWindows = await invoke("get_platform");
    if (isWindows) {
      return shellerWin(args);
    }
  };

  const shellerWin = async (args) => {
    let dataDirPath = await appDataDir();
    const output = await new Command(
      "python",
      [
        `${dataDirPath}sheller.py`,
        ...args,
      ],
      {
        cwd: dataDirPath,
      }
    ).execute();
    return JSON.parse(output.stdout);
  }

  return <Sheller.Provider value={{ sheller }}>{children}</Sheller.Provider>;
};

export const useSheller = () => {
  return useContext(Sheller).sheller;
};

export default ShellProvider;

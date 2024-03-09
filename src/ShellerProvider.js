import { createContext, useContext, useEffect, useState } from "react";
import { Command } from "@tauri-apps/api/shell";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";

const Sheller = createContext();

const ShellProvider = ({ children }) => {
  const [dataDirPath, setDataDirPath] = useState("");
  const [settings, setSettings] = useState(null);
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    appDataDir().then((dataDirPath) => {
      setDataDirPath(dataDirPath);
    });
    invoke("get_platform").then((platform) => {
      setPlatform(platform);
    });
  });

  const sheller = async (args) => {
    if (platform === "windows") {
      return shellerWin(args);
    }
  };

  const shellerWin = async (args) => {
    const output = await new Command(
      "python",
      [`${dataDirPath}sheller.py`, ...args],
      {
        cwd: dataDirPath,
      }
    ).execute();
    return JSON.parse(output.stdout);
  };

  return (
    <Sheller.Provider value={{ sheller, settings, setSettings }}>
      {children}
    </Sheller.Provider>
  );
};

export const useSheller = () => {
  return useContext(Sheller).sheller;
};

export const useSettings = () => {
  return useContext(Sheller).settings;
};

export const useSetSettings = () => {
  return useContext(Sheller).setSettings;
};

export default ShellProvider;

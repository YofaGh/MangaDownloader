import { createContext, useContext, useState } from "react";
import { Command } from '@tauri-apps/api/shell';

const Sheller = createContext();

const ShellProvider = ({ children }) => {
  const [shellerPath, setShellerPath] = useState(null);

  const sheller = async (args) => {
    const command = Command.sidecar("../bin/gsheller", args);
    const response = await command.execute();
    return JSON.parse(response.stdout);
  };

  return (
    <Sheller.Provider value={{ sheller, setShellerPath }}>
      {children}
    </Sheller.Provider>
  );
};

export const useSheller = () => {
  return useContext(Sheller).sheller;
};

export const useShellerPathSetter = () => {
  return useContext(Sheller).setShellerPath;
};

export default ShellProvider;

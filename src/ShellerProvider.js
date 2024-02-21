import { createContext, useContext } from "react";
import { Command } from '@tauri-apps/api/shell';

const Sheller = createContext();

const ShellProvider = ({ children }) => {

  const sheller = async (args) => {
    const command = Command.sidecar("../bin/sheller", args);
    const response = await command.execute();
    return JSON.parse(response.stdout);
  };

  return (
    <Sheller.Provider value={{ sheller }}>
      {children}
    </Sheller.Provider>
  );
};

export const useSheller = () => {
  return useContext(Sheller).sheller;
};

export default ShellProvider;

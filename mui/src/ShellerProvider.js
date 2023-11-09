import { createContext, useContext, useState } from "react";

const Sheller = createContext();

const ShellProvider = ({ children }) => {
  const [shellerPath, setShellerPath] = useState(null);

  const sheller = async (args) => {
    const response = await window.do.sheller(shellerPath, args);
    return response;
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

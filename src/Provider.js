import {
  createContext,
  useContext,
  useEffect,
  useState,
  useReducer,
} from "react";
import { v4 } from "uuid";
import { Command } from "@tauri-apps/api/shell";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";
import { Notification } from "./components";

const ProviderContext = createContext();

const Provider = (props) => {
  const [dataDirPath, setDataDirPath] = useState("");
  const [settings, setSettings] = useState(null);
  const [platform, setPlatform] = useState("");
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "ADD_NOTIFICATION":
        return [...state, { ...action.payload }];
      case "REMOVE_NOTIFICATION":
        return state.filter((el) => el.id !== action.id);
      default:
        return state;
    }
  }, []);

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
    return shellerUnix(args);
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

  const shellerUnix = async (args) => {
    const command = Command.sidecar("../bin/sheller", args);
    const response = await command.execute();
    return JSON.parse(response.stdout);
  };

  return (
    <ProviderContext.Provider
      value={{ dispatch, sheller, settings, setSettings }}
    >
      <div className={"notification-wrapper"}>
        {state.map((note) => {
          return <Notification dispatch={dispatch} key={note.id} {...note} />;
        })}
      </div>
      {props.children}
    </ProviderContext.Provider>
  );
};

export const useSuccessNotification = () => {
  const { dispatch } = useContext(ProviderContext);
  return (message) => {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: v4(),
        type: "SUCCESS",
        message,
      },
    });
  };
};

export const useErrorNotification = () => {
  const { dispatch } = useContext(ProviderContext);
  return (message) => {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        id: v4(),
        type: "ERROR",
        message,
      },
    });
  };
};

export const useSheller = () => {
  return useContext(ProviderContext).sheller;
};

export const useSettings = () => {
  return useContext(ProviderContext).settings;
};

export const useSetSettings = () => {
  return useContext(ProviderContext).setSettings;
};

export default Provider;

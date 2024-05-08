import { createContext, useContext, useState, useReducer } from "react";
import { v4 } from "uuid";
import { Notification } from "./components";

const ProviderContext = createContext();

const Provider = (props) => {
  const [settings, setSettings] = useState(null);
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

  return (
    <ProviderContext.Provider value={{ dispatch, settings, setSettings }}>
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

export const useSettings = () => {
  return useContext(ProviderContext).settings;
};

export const useSetSettings = () => {
  return useContext(ProviderContext).setSettings;
};

export default Provider;
import { useState, useEffect } from "react";
import { useNotificationStore } from "../store";

export default function NotificationProvider() {
  return (
    <div className="notification-wrapper">
      {useNotificationStore((state) => state.notifications).map(
        (notification) => (
          <Notification key={notification.id} {...notification} />
        )
      )}
    </div>
  );
}

const Notification = ({ id, message, type }) => {
  const [exit, setExit] = useState(false);
  const [width, setWidth] = useState(0);
  const [intervalID, setIntervalID] = useState(null);
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  );

  const handleStartTimer = () => {
    const id = setInterval(
      () =>
        setWidth((prev) => {
          if (prev < 100) return prev + 0.5;
          clearInterval(id);
          return prev;
        }),
      20
    );
    setIntervalID(id);
  };

  useEffect(() => {
    const handleCloseNotification = () => {
      clearInterval(intervalID);
      setExit(true);
      setTimeout(() => removeNotification(id), 400);
    };
    if (width === 100) handleCloseNotification();
  }, [id, intervalID, removeNotification, width]);

  useEffect(() => {
    handleStartTimer();
  }, []);

  return (
    <div
      onMouseLeave={handleStartTimer}
      onMouseEnter={() => clearInterval(intervalID)}
      className={`notification-item ${type} ${exit ? "exit" : ""}`}
    >
      <p>{message}</p>
      <div className="bar" style={{ width: `${width}%` }} />
    </div>
  );
};

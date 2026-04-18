import { useEffect, useState } from "react";

export default function Popup() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("enabled", (res: { enabled?: boolean }) => {
      setEnabled(res.enabled || false);
    });
  }, []);

  const toggle = () => {
    const newState = !enabled;
    setEnabled(newState);

    chrome.runtime.sendMessage({
      type: "TOGGLE",
      enabled: newState
    });
  };

  return (
    <div style={{ padding: 20, width: 200 }}>
      <h3>Ad Blocker</h3>
      <button onClick={toggle}>
        {enabled ? "Disable" : "Enable"}
      </button>
    </div>
  );
}
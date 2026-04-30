import { useEffect, useState, useReducer } from "react";

type Ad = {
  src: string;
  tag: string;
};

type State = {
  adsByTab: Record<number, Ad[]>;
  total: number;
  activeTabId: number | null;
};

type Action =
  | { type: "SET_DATA"; payload: { adsByTab: any } }
  | { type: "SET_ACTIVE_TAB"; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DATA":
      const total = Object.values(action.payload.adsByTab)
        .flat()
        .length;

      return {
        ...state,
        adsByTab: action.payload.adsByTab,
        total
      };

    case "SET_ACTIVE_TAB":
      return {
        ...state,
        activeTabId: action.payload
      };

    default:
      return state;
  }
}

export default function Popup() {
  const [enabled, setEnabled] = useState(false);
  const [state, dispatch] = useReducer(reducer, { adsByTab: {}, total: 0, activeTabId: null });

  async function loadData() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    const response = await chrome.runtime.sendMessage({
      type: "GET_ADS"
    });

    dispatch({
      type: "SET_DATA",
      payload: { adsByTab: response }
    });

    if (tab.id !== undefined) {
      dispatch({
        type: "SET_ACTIVE_TAB",
        payload: tab.id
      });
    }
  }

  useEffect(() => {
    chrome.storage.local.get("enabled", (res: { enabled?: boolean }) => {
      setEnabled(res.enabled || false);
    });

    loadData()
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggle = () => {
    const newState = !enabled;

    // Update React state
    setEnabled(newState);

    // Persist to chrome storage
    chrome.storage.local.set({ enabled: newState });

    // Notify background/content scripts
    chrome.runtime.sendMessage({
      type: "TOGGLE",
      enabled: newState
    });
  };

  const activeAds = state.activeTabId !== null ? state.adsByTab[state.activeTabId] || [] : [];

  return (
    <div style={{ padding: 20, width: 200 }}>
      <span style={{ display: "flex", justifyContent: "center", flexDirection: "row" }}>
        <img width={40} src={"./icons/icon.png"} />
        <h3>Ad Blocker</h3>
      </span>

      <div className="container">
        <input
          type="checkbox"
          className="checkbox"
          id="checkbox"
          checked={enabled}
          onChange={toggle}
        />
        <label className="switch" htmlFor="checkbox">
          <span className="slider"></span>
        </label>
      </div>

      <h3>{enabled ? "ON" : "OFF"}</h3>

      <h2>Total Ads Detected: {state.total}</h2>
      <h3>Active Tab Ads: {activeAds.length}</h3>
    </div>
  );
}
import { useEffect, useState, useReducer } from "react";
import { FcCancel, FcSalesPerformance, FcCollect } from "react-icons/fc";
import ObservedActivities from "../chart/DoughnutChart";

type Ad = {
  src: string;
  tag: string;
};

type BlockedRule = {
  ruleId: number;
  rule: chrome.declarativeNetRequest.MatchedRule;
  requests: Set<string>;
  count: number;
}

type State = {
  adsByTab: Record<number, Ad[]>;
  total: number;
  activeTabId: number | null;
  blockedRules: BlockedRule[];
};

type Action =
  | { type: "SET_DATA"; payload: { adsByTab: any } }
  | { type: "SET_ACTIVE_TAB"; payload: number }
  | { type: "SET_BLOCKED_RULES"; payload: BlockedRule[] };

function activeTabReducer(state: State, action: Action): State {
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

    case "SET_BLOCKED_RULES":
      return {
        ...state,
        blockedRules: action.payload
      };

    default:
      return state;
  }
}

export default function Popup() {
  const [enabled, setEnabled] = useState(false);
  const [state, dispatch] = useReducer(activeTabReducer, { adsByTab: {}, total: 0, activeTabId: null, blockedRules: [] });

  async function loadData() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    const response = await chrome.runtime.sendMessage({
      type: "GET_ADS"
    });

    const blockedResponse = await chrome.runtime.sendMessage({
      type: "GET_BLOCKED_ADS_RULES"
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

    dispatch({
      type: "SET_BLOCKED_RULES",
      payload: blockedResponse
    });
  }

  useEffect(() => {
    chrome.storage.local.get("enabled", (res: { enabled?: boolean }) => {
      setEnabled(res.enabled || false);
    });

    loadData()
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [enabled]);

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

  // const activeAds = state.activeTabId !== null ? state.adsByTab[state.activeTabId] || [] : []; --- IGNORE ---
  const blockedRules = state.blockedRules || [];

  // accumulate total blocked ads from rules
  const totalBlockedAds = blockedRules.reduce((sum, rule) => sum + rule.count, 0);
  // '1' = blocked ad, '2' = blocked tracker (see rules.ts)
  const totalBlockedTrackers = blockedRules.filter(r => r.ruleId === 2).reduce((sum, r) => sum + r.count, 0);

  return (
    <>
      <div className="container-div">
        <div className="title-div">
          <span className="title">
            <img width={40} src={"./icons/icon.png"} />
            <h3>Ad Blocker</h3>
          </span>

          <span className="toggle-on-off">
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
          </span>
        </div>

        {/* contents grid here  */}
        <hr />
        <div className="card-container">
          <div className="card">
            <span className="grid-icon-text">
              <FcCancel size={20} />
              <h3>{totalBlockedAds}</h3>
            </span>
            <span>Blocked Sites</span>
          </div>

          <div className="card">
            <span className="grid-icon-text">
              <FcCollect size={20} />
              <h3>{totalBlockedTrackers}</h3>
            </span>
            <span>Trackers removed</span>
          </div>

          <div className="card">
            <span className="grid-icon-text">
              <FcSalesPerformance size={20} />
              <h3>{state.total}</h3>
            </span>
            <span>Total Ads Detected</span>
          </div>
          
        </div>

        {/* doughnut chart here */}
        <ObservedActivities blockedRules={blockedRules} adsBlocked={state.adsByTab} />

      </div>
    </>
  );
}
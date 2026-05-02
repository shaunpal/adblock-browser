import { useRef, useEffect, useState, useMemo } from "react";
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  type Plugin,
} from "chart.js";
import { isDomainPresentinCategory } from "../utils/domains";

Chart.register(DoughnutController, ArcElement, Tooltip);

type Ad = {
  src: string;
  tag: string;
};

interface Activity {
  name: string;
  count: number;
  color: string;
}

const activities: Activity[] = [
  { name: "Advertising",          count: 0,  color: "#a78bfa" },
  { name: "Site Analytics",       count: 0,  color: "#67e8f9" },
  { name: "Social Media",         count: 0,  color: "#6366f1" },
  { name: "Third-Party",          count: 0,  color: "#fb923c" },
  { name: "Other",                count: 0,  color: "#cbd5e1" },
];

// Custom plugin to render total count in the center of the doughnut chart
const centerTextPlugin: Plugin<"doughnut"> = {
  id: "centerText",
  beforeDraw(chart) {
    const { ctx, chartArea: { left, top, right, bottom }, data } = chart;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;

    // Dynamically compute total
    const total = data.datasets[0].data.reduce(
      (sum, value) => sum + Number(value),
      0
    );

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 26px 'DM Sans', sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(String(total), cx, cy - 8);
    ctx.font = "400 10px 'DM Sans', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("TOTAL", cx, cy + 12);
    ctx.restore();
  },
};

type BlockedRule = {
  ruleId: number;
  rule: chrome.declarativeNetRequest.MatchedRule;
  requests: Set<string>;
  count: number;
}

export function updateActivities(blockedRules: BlockedRule[], adsBlocked: Record<number, Ad[]>): Activity[] {
  const categoryCounts: Record<string, number> = {};
  blockedRules.forEach(rule => {
    let category = "Other";
    const requests = Array.from(rule.requests);
    for (let i=0; i < requests.length; i++) {
      const url = requests[i];
      if (isDomainPresentinCategory(url, "advertising")) {
        category = "Advertising";
      } else if (isDomainPresentinCategory(url, "analytics")) {
        category = "Site Analytics";
      } else if (isDomainPresentinCategory(url, "social_media")) {
        category = "Social Media";
      } else if (isDomainPresentinCategory(url, "third_party")) {
        category = "Third-Party";
      }
      categoryCounts[category] = (categoryCounts[category] || 0) + rule.count;
    }
  });

  // Include blocked ads in counts
  Object.values(adsBlocked).flat().forEach((ad) => {
    const url = ad.src || "unknown";
    let category = "Other";
    if (isDomainPresentinCategory(url, "advertising")) {
      category = "Advertising";
    } else if (isDomainPresentinCategory(url, "analytics")) {
      category = "Site Analytics";
    } else if (isDomainPresentinCategory(url, "social_media")) {
      category = "Social Media";
    } else if (isDomainPresentinCategory(url, "third_party")) {
      category = "Third-Party";
    }

    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return activities.map((activity) => ({
    ...activity,
    count: categoryCounts[activity.name] || 0
  }));
}

export default function ObservedActivities({ blockedRules, adsBlocked }: { blockedRules: BlockedRule[], adsBlocked: Record<number, Ad[]> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activities = useMemo(
    () => updateActivities(blockedRules, adsBlocked),
    [blockedRules, adsBlocked]
  );
  const total = activities.reduce((sum, a) => sum + a.count, 0);
  // Re-render of chart only occurs when total count changes (not on every render) to preserve hover state
  const prevTotal = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d")!;

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      plugins: [centerTextPlugin],
      data: {
        labels: activities.map((a) => a.name),
        datasets: [{
          data: activities.map((a) => a.count),
          backgroundColor: activities.map((a) => a.color),
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 8,
          spacing: 2,
        }],
      },
      options: {
        cutout: "65%",
        responsive: true,
        maintainAspectRatio: true,
        animation: { animateRotate: true, duration: 800, easing: "easeInOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` },
            backgroundColor: "#1e293b",
            padding: 10,
            cornerRadius: 8,
          },
        },
        onHover: (_, elements) =>
          setHoveredIndex(elements.length > 0 ? elements[0].index : null),
      },
    });

    prevTotal.current = total;
    return () => chartRef.current?.destroy();
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 🚀 Only update if total increased
    if (total <= prevTotal.current) return;

    chart.data.labels = activities.map((a) => a.name);
    chart.data.datasets[0].data = activities.map((a) => a.count);
    chart.data.datasets[0].backgroundColor = activities.map((a) => a.color);

    chart.update();

    prevTotal.current = total;
}, [total, activities]);

  const handleLegendEnter = (i: number) => {
    setHoveredIndex(i);
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.datasets[0].backgroundColor = activities.map((a, idx) =>
      idx === i ? a.color : a.color + "55"
    );
    chart.update("none");
  };

  const handleLegendLeave = () => {
    setHoveredIndex(null);
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.datasets[0].backgroundColor = activities.map((a) => a.color);
    chart.update("none");
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "16px 18px",
      width: 300,          // ← hard capped at 300px
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>Observed activities</span>
        {/* Toolbar buttons */}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Chart — shrunk to 110px to leave room for legend */}
        <div style={{ width: 110, height: 110, flexShrink: 0, position: "relative", zIndex: 10 }}>
          <canvas ref={canvasRef} width={110} height={110} />
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1}}>
          {activities.map((a, i) => (
            <div
              key={i}
              onMouseEnter={() => handleLegendEnter(i)}
              onMouseLeave={handleLegendLeave}
              style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "2px 5px",
                borderRadius: 6, cursor: "pointer",
                background: hoveredIndex === i ? "#f8fafc" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: a.color, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 11, color: "#475569",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{a.name}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginLeft: 4 }}>
                {a.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
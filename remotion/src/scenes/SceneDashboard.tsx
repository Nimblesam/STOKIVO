import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { BrowserFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";

const Kpi: React.FC<{ label: string; target: number; prefix?: string; suffix?: string; trend: string; i: number }> = ({ label, target, prefix = "", suffix = "", trend, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 18 - i * 8, fps, config: { damping: 18 } });
  const v = interpolate(frame - 25, [0, 50], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity: enter,
      transform: `translateY(${interpolate(enter, [0, 1], [25, 0])}px)`,
      background: COLORS.surfaceAlt,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 14,
      padding: 22,
    }}>
      <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: COLORS.text, marginTop: 8, letterSpacing: -1 }}>
        {prefix}{Math.floor(v).toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 13, color: COLORS.success, marginTop: 4, fontWeight: 600 }}>↑ {trend}</div>
    </div>
  );
};

const Bar: React.FC<{ h: number; i: number }> = ({ h, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({ frame: frame - 50 - i * 4, fps, config: { damping: 16 } });
  return (
    <div style={{
      flex: 1,
      height: `${h * grow}%`,
      background: `linear-gradient(180deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
      borderRadius: "6px 6px 0 0",
      minHeight: 4,
      boxShadow: `0 0 12px ${COLORS.primary}44`,
    }} />
  );
};

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });

  const bars = [40, 62, 38, 75, 52, 88, 70];

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 08 — Dashboard" title="Know your numbers" subtitle="Real-time sales, profit & inventory health." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.85)`, marginTop: 80 }}>
        <BrowserFrame url="app.stokivo.com/dashboard">
          <div style={{ padding: 36, height: "100%", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 28, color: COLORS.text, margin: "0 0 24px 0", fontWeight: 700 }}>Today at a glance</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <Kpi label="Revenue" target={2847} prefix="£" trend="18% vs yesterday" i={0} />
              <Kpi label="Transactions" target={64} trend="9 last hour" i={1} />
              <Kpi label="Avg basket" target={44} prefix="£" trend="3.2% up" i={2} />
              <Kpi label="Items sold" target={312} trend="22% week" i={3} />
            </div>
            <div style={{
              flex: 1,
              background: COLORS.surfaceAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 22,
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 16, color: COLORS.text, fontWeight: 700 }}>Sales · last 7 days</div>
                <div style={{ fontSize: 13, color: COLORS.primaryGlow, fontWeight: 600 }}>+24.6% week-on-week</div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 14, padding: "10px 0" }}>
                {bars.map((h, i) => <Bar key={i} h={h} i={i} />)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} style={{ flex: 1, textAlign: "center" }}>{d}</div>)}
              </div>
            </div>
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

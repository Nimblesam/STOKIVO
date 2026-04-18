import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { COLORS } from "../theme";
import { TabletFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";

const Option: React.FC<{ icon: string; title: string; desc: string; i: number; selected: boolean }> = ({ icon, title, desc, i, selected }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 15 - i * 12, fps, config: { damping: 18 } });
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px) scale(${selected ? 1.03 : 1})`,
        background: selected ? `linear-gradient(135deg, ${COLORS.primary}55, ${COLORS.primarySoft})` : COLORS.surfaceAlt,
        border: `2px solid ${selected ? COLORS.primaryGlow : COLORS.border}`,
        borderRadius: 16,
        padding: 26,
        display: "flex",
        gap: 18,
        alignItems: "center",
        boxShadow: selected ? `0 14px 40px ${COLORS.primary}66` : "none",
        transition: "all 0.2s",
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        background: selected ? "rgba(255,255,255,0.12)" : COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>{title}</div>
        <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>{desc}</div>
      </div>
      <div style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        border: `2px solid ${selected ? COLORS.primaryGlow : COLORS.textMuted}`,
        background: selected ? COLORS.primaryGlow : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
      }}>{selected ? "✓" : ""}</div>
    </div>
  );
};

export const SceneCardPayment: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });

  const phase = frame < 70 ? "select" : frame < 110 ? "processing" : "success";

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 05 — Card Payment" title="Hybrid card flow" subtitle="Manual entry or send to terminal." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.9)`, marginTop: 60 }}>
        <TabletFrame width={1080} height={760}>
          <div style={{ padding: 40, height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Card payment</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: COLORS.text, marginTop: 4 }}>£<TotalCount /></div>
            </div>

            {phase === "select" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                <Option icon="📲" title="Send to terminal" desc="Send total to connected card machine." i={0} selected />
                <Option icon="🧾" title="Manual entry" desc="Enter on external POS terminal." i={1} selected={false} />
              </div>
            )}

            {phase === "processing" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <PulseRing />
                <div style={{ marginTop: 36, fontSize: 24, color: COLORS.text, fontWeight: 700 }}>
                  Tap, insert or swipe card
                </div>
                <div style={{ marginTop: 8, fontSize: 16, color: COLORS.textMuted }}>
                  Connected to Stokivo Terminal · Ingenico Move/5000
                </div>
              </div>
            )}

            {phase === "success" && (
              <Sequence from={0}>
                <SuccessView />
              </Sequence>
            )}
          </div>
        </TabletFrame>
      </div>
    </AbsoluteFill>
  );
};

const TotalCount: React.FC = () => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [0, 35], [0, 51.34], { extrapolateRight: "clamp" });
  return <span>{v.toFixed(2)}</span>;
};

const PulseRing: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = (Math.sin(frame / 6) + 1) / 2;
  return (
    <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        border: `2px solid ${COLORS.primaryGlow}`,
        opacity: 1 - pulse,
        transform: `scale(${1 + pulse * 0.4})`,
      }} />
      <div style={{
        width: 130,
        height: 130,
        borderRadius: 65,
        background: `linear-gradient(135deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 60,
        boxShadow: `0 0 80px ${COLORS.primary}99`,
      }}>💳</div>
    </div>
  );
};

const SuccessView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 10 } });
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 160,
        height: 160,
        borderRadius: 80,
        background: `${COLORS.success}22`,
        border: `4px solid ${COLORS.success}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 80,
        color: COLORS.success,
        transform: `scale(${e})`,
        boxShadow: `0 0 60px ${COLORS.success}66`,
      }}>✓</div>
      <div style={{ marginTop: 30, fontSize: 32, fontWeight: 800, color: COLORS.text }}>Payment approved</div>
      <div style={{ marginTop: 6, fontSize: 16, color: COLORS.textMuted }}>£51.34 · VISA •••• 4242</div>
    </div>
  );
};

import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { BrowserFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";

const orders = [
  { id: "A8F3-204", time: "2 min ago", items: 4, total: "£51.34", method: "Card", status: "Paid" },
  { id: "A8F3-203", time: "11 min ago", items: 2, total: "£12.40", method: "Cash", status: "Paid" },
  { id: "A8F3-202", time: "26 min ago", items: 7, total: "£89.10", method: "Card", status: "Paid" },
  { id: "A8F3-201", time: "44 min ago", items: 1, total: "£3.80", method: "Cash", status: "Paid" },
  { id: "A8F3-200", time: "1 h ago", items: 5, total: "£62.75", method: "Card", status: "Paid" },
  { id: "A8F3-199", time: "1 h ago", items: 3, total: "£21.60", method: "Card", status: "Refund" },
];

const Row: React.FC<{ o: typeof orders[0]; i: number }> = ({ o, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 18 } });
  return (
    <div style={{
      opacity: enter,
      transform: `translateX(${interpolate(enter, [0, 1], [40, 0])}px)`,
      display: "grid",
      gridTemplateColumns: "160px 1fr 100px 80px 130px 110px",
      alignItems: "center",
      gap: 14,
      padding: "16px 22px",
      background: COLORS.surfaceAlt,
      borderRadius: 10,
      marginBottom: 8,
      border: `1px solid ${COLORS.border}`,
    }}>
      <div style={{ fontSize: 14, color: COLORS.text, fontFamily: "monospace", fontWeight: 600 }}>#{o.id}</div>
      <div style={{ fontSize: 13, color: COLORS.textMuted }}>{o.time}</div>
      <div style={{ fontSize: 13, color: COLORS.textMuted }}>{o.items} items</div>
      <div style={{ fontSize: 13, color: COLORS.textMuted }}>{o.method}</div>
      <div style={{ fontSize: 18, color: COLORS.text, fontWeight: 700 }}>{o.total}</div>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: o.status === "Paid" ? COLORS.success : COLORS.accent,
        background: o.status === "Paid" ? `${COLORS.success}22` : `${COLORS.accent}22`,
        padding: "5px 10px",
        borderRadius: 6,
        textAlign: "center",
      }}>{o.status}</div>
    </div>
  );
};

export const SceneOrders: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 07 — Orders" title="Every transaction, organised" subtitle="Search, refund, reprint — anytime." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.85)`, marginTop: 80 }}>
        <BrowserFrame url="app.stokivo.com/orders">
          <div style={{ padding: 36, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
              <div>
                <h3 style={{ fontSize: 30, color: COLORS.text, margin: 0, fontWeight: 700 }}>Order history</h3>
                <p style={{ fontSize: 14, color: COLORS.textMuted, margin: "4px 0 0 0" }}>Today · 6 transactions</p>
              </div>
              <div style={{
                background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: 14,
                color: COLORS.textMuted,
              }}>🔍 Search by ID, customer or item</div>
            </div>
            {orders.map((o, i) => <Row key={o.id} o={o} i={i} />)}
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { SceneCaption } from "../components/Caption";

const Line: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 18 : 14, fontWeight: bold ? 800 : 500, color: bold ? "#000" : "#333", marginTop: bold ? 8 : 3 }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export const SceneReceipt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });
  const printY = interpolate(frame, [20, 90], [-700, 0], { extrapolateRight: "clamp" });
  const fold = interpolate(frame, [60, 100], [0, 8]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <SceneCaption step="Step 06 — Receipt" title="Print or send instantly" subtitle="Thermal printer, email, or WhatsApp." />
      {/* Printer */}
      <div style={{ opacity: inUp, transform: `scale(0.95)`, marginTop: 110, position: "relative" }}>
        <div style={{
          width: 520,
          height: 110,
          background: "linear-gradient(180deg, #2a2530, #181420)",
          borderRadius: 20,
          padding: 22,
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
          border: `1px solid ${COLORS.border}`,
          position: "relative",
          zIndex: 3,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: COLORS.success, boxShadow: `0 0 14px ${COLORS.success}` }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>Stokivo Receipt Printer</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 3 }}>Connected · 80mm thermal</div>
          </div>
          {/* Slot */}
          <div style={{ position: "absolute", left: 60, right: 60, bottom: -3, height: 6, background: "#000", borderRadius: 3 }} />
        </div>

        {/* Receipt paper */}
        <div style={{
          position: "absolute",
          top: 100,
          left: "50%",
          transform: `translateX(-50%) translateY(${printY}px)`,
          width: 360,
          background: "#fff",
          borderRadius: "0 0 6px 6px",
          padding: "30px 28px 28px",
          fontFamily: "monospace",
          color: "#000",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
          clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${fold}px), 95% 100%, 90% calc(100% - ${fold/2}px), 85% 100%, 80% calc(100% - ${fold}px), 75% 100%, 70% calc(100% - ${fold/2}px), 65% 100%, 60% calc(100% - ${fold}px), 55% 100%, 50% calc(100% - ${fold/2}px), 45% 100%, 40% calc(100% - ${fold}px), 35% 100%, 30% calc(100% - ${fold/2}px), 25% 100%, 20% calc(100% - ${fold}px), 15% 100%, 10% calc(100% - ${fold/2}px), 5% 100%, 0 calc(100% - ${fold}px))`,
          zIndex: 2,
        }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>SNI FOODS LTD</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>42 High Street · London · UK</div>
            <div style={{ fontSize: 10, color: "#555" }}>Receipt #A8F3-204</div>
          </div>
          <div style={{ borderTop: "1px dashed #888", marginBottom: 10 }} />
          <Line label="Basmati Rice 5kg ×2" value="£25.98" />
          <Line label="Olive Oil 1L" value="£8.50" />
          <Line label="Coca-Cola 24pk" value="£14.20" />
          <Line label="Plantain Chips ×3" value="£6.45" />
          <div style={{ borderTop: "1px dashed #888", margin: "10px 0" }} />
          <Line label="Subtotal" value="£55.13" />
          <Line label="VAT 5%" value="£2.76" />
          <Line label="TOTAL" value="£51.34" bold />
          <div style={{ borderTop: "1px dashed #888", margin: "10px 0" }} />
          <Line label="Card · VISA •4242" value="APPROVED" />
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#444" }}>
            Thank you for shopping with us!
          </div>
          <div style={{ textAlign: "center", marginTop: 4, fontSize: 9, color: "#888" }}>
            Powered by Stokivo · stokivo.com
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

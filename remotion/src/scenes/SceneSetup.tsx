import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { COLORS } from "../theme";
import { BrowserFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";

const products = [
  { name: "Basmati Rice 5kg", price: "£12.99", cat: "Grains", emoji: "🍚" },
  { name: "Olive Oil 1L", price: "£8.50", cat: "Pantry", emoji: "🫒" },
  { name: "Coca-Cola 24×330ml", price: "£14.20", cat: "Drinks", emoji: "🥤" },
  { name: "Plantain Chips", price: "£2.15", cat: "Snacks", emoji: "🍌" },
  { name: "Free Range Eggs ×12", price: "£3.80", cat: "Dairy", emoji: "🥚" },
  { name: "Whole Wheat Bread", price: "£1.95", cat: "Bakery", emoji: "🍞" },
];

const ProductRow: React.FC<{ p: typeof products[0]; i: number }> = ({ p, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 18 } });
  const x = interpolate(enter, [0, 1], [60, 0]);
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateX(${x}px)`,
        display: "grid",
        gridTemplateColumns: "60px 1fr 140px 120px 80px",
        alignItems: "center",
        gap: 16,
        padding: "16px 22px",
        background: COLORS.surfaceAlt,
        borderRadius: 12,
        marginBottom: 10,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div style={{ fontSize: 32 }}>{p.emoji}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>{p.name}</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>SKU-{1000 + i}</div>
      </div>
      <div style={{
        fontSize: 13,
        color: COLORS.primaryGlow,
        background: `${COLORS.primary}22`,
        padding: "5px 12px",
        borderRadius: 6,
        fontWeight: 600,
        textAlign: "center",
      }}>{p.cat}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, textAlign: "right" }}>{p.price}</div>
      <div style={{
        fontSize: 13,
        color: COLORS.success,
        textAlign: "right",
        fontWeight: 600,
      }}>● Stock</div>
    </div>
  );
};

export const SceneSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 02 — Setup" title="Add products & inventory" subtitle="Build your catalogue in seconds." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.85)`, marginTop: 80 }}>
        <BrowserFrame url="app.stokivo.com/products">
          <div style={{ padding: 36, height: "100%", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 30, color: COLORS.text, margin: 0, fontWeight: 700 }}>Products</h3>
                <p style={{ fontSize: 15, color: COLORS.textMuted, margin: "4px 0 0 0" }}>
                  <Sequence from={20}><CounterUp to={products.length} /></Sequence> items in catalogue
                </p>
              </div>
              <Sequence from={90}>
                <AddedBadge />
              </Sequence>
            </div>
            {products.map((p, i) => (
              <ProductRow key={p.name} p={p} i={i} />
            ))}
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

const CounterUp: React.FC<{ to: number }> = ({ to }) => {
  const frame = useCurrentFrame();
  const v = Math.floor(interpolate(frame, [0, 50], [0, to], { extrapolateRight: "clamp" }));
  return <span style={{ color: COLORS.primaryGlow, fontWeight: 700 }}>{v}</span>;
};

const AddedBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        opacity: e,
        transform: `scale(${interpolate(e, [0, 1], [0.6, 1])})`,
        background: `${COLORS.success}22`,
        border: `1px solid ${COLORS.success}55`,
        color: COLORS.success,
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      ✓ Catalogue ready
    </div>
  );
};

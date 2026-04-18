import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { COLORS } from "../theme";
import { TabletFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";

const items = [
  { name: "Basmati Rice 5kg", price: 12.99, qty: 2, emoji: "🍚" },
  { name: "Olive Oil 1L", price: 8.50, qty: 1, emoji: "🫒" },
  { name: "Coca-Cola 24×330ml", price: 14.20, qty: 1, emoji: "🥤" },
  { name: "Plantain Chips", price: 2.15, qty: 3, emoji: "🍌" },
];

const CartItem: React.FC<{ item: typeof items[0]; i: number }> = ({ item, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 20 - i * 12, fps, config: { damping: 18 } });
  const lineTotal = (item.price * item.qty).toFixed(2);
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [60, 0])}px)`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        background: COLORS.surfaceAlt,
        borderRadius: 10,
        marginBottom: 10,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div style={{ fontSize: 28 }}>{item.emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: COLORS.text, fontWeight: 600 }}>{item.name}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>£{item.price.toFixed(2)} × {item.qty}</div>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.text }}>£{lineTotal}</div>
    </div>
  );
};

const Tile: React.FC<{ name: string; price: string; emoji: string; i: number }> = ({ name, price, emoji, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 5 - i * 4, fps, config: { damping: 18 } });
  return (
    <div
      style={{
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
        background: COLORS.surfaceAlt,
        borderRadius: 12,
        padding: 14,
        border: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 110,
      }}
    >
      <div style={{ fontSize: 28 }}>{emoji}</div>
      <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 600, textAlign: "center", marginTop: 6, lineHeight: 1.2 }}>{name}</div>
      <div style={{ fontSize: 13, color: COLORS.primaryGlow, fontWeight: 700, marginTop: 4 }}>{price}</div>
    </div>
  );
};

const tiles = [
  { name: "Rice 5kg", price: "£12.99", emoji: "🍚" },
  { name: "Olive Oil", price: "£8.50", emoji: "🫒" },
  { name: "Cola 24pk", price: "£14.20", emoji: "🥤" },
  { name: "Chips", price: "£2.15", emoji: "🍌" },
  { name: "Eggs 12", price: "£3.80", emoji: "🥚" },
  { name: "Bread", price: "£1.95", emoji: "🍞" },
  { name: "Milk 2L", price: "£2.20", emoji: "🥛" },
  { name: "Bananas", price: "£1.40", emoji: "🍌" },
  { name: "Tomato", price: "£0.95", emoji: "🍅" },
];

export const SceneCheckout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const totalGrow = spring({ frame: frame - 90, fps, config: { damping: 12 } });
  const cardHighlight = spring({ frame: frame - 120, fps, config: { damping: 8 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 04 — Checkout" title="Ring up sales in seconds" subtitle="Tap, scan, or search to add." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.85)`, marginTop: 60 }}>
        <TabletFrame width={1280} height={780}>
          <div style={{ display: "flex", height: "100%" }}>
            {/* Product grid */}
            <div style={{ flex: 1.3, padding: 22, background: COLORS.bg, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {["All", "Grains", "Drinks", "Snacks", "Dairy", "Bakery"].map((c, i) => (
                  <div key={c} style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: i === 0 ? COLORS.primary : COLORS.surfaceAlt,
                    color: i === 0 ? "#fff" : COLORS.textMuted,
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1px solid ${COLORS.border}`,
                  }}>{c}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {tiles.map((t, i) => <Tile key={t.name} {...t} i={i} />)}
              </div>
            </div>
            {/* Cart */}
            <div style={{ width: 460, background: COLORS.surface, borderLeft: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", padding: 22 }}>
              <div style={{ fontSize: 18, color: COLORS.text, fontWeight: 700, marginBottom: 14 }}>Current sale</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                {items.map((it, i) => <CartItem key={it.name} item={it} i={i} />)}
              </div>
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 8 }}>
                <Row label="Subtotal" value={`£${subtotal.toFixed(2)}`} />
                <Row label="VAT (5%)" value={`£${tax.toFixed(2)}`} />
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 12,
                  fontSize: 28,
                  fontWeight: 800,
                  color: COLORS.text,
                  transform: `scale(${1 + totalGrow * 0.06})`,
                  transformOrigin: "right",
                }}>
                  <span>Total</span>
                  <span style={{ color: COLORS.primaryGlow }}>£{total.toFixed(2)}</span>
                </div>
                <Sequence from={110}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                    <PayBtn icon="💵" label="Cash" />
                    <PayBtn icon="💳" label="Card" highlight={cardHighlight} />
                  </div>
                </Sequence>
              </div>
            </div>
          </div>
        </TabletFrame>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const PayBtn: React.FC<{ icon: string; label: string; highlight?: number }> = ({ icon, label, highlight = 0 }) => (
  <div style={{
    height: 64,
    background: highlight > 0 ? `linear-gradient(135deg, ${COLORS.primaryGlow}, ${COLORS.primary})` : COLORS.surfaceAlt,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: 700,
    border: `1px solid ${highlight > 0 ? COLORS.primaryGlow : COLORS.border}`,
    boxShadow: highlight > 0 ? `0 10px 28px ${COLORS.primary}88` : "none",
    transform: `scale(${1 + highlight * 0.04})`,
  }}>
    <span style={{ fontSize: 22 }}>{icon}</span>
    {label}
  </div>
);

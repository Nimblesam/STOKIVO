import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { COLORS } from "../theme";
import { TabletFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";
import { StokivoLogo } from "../components/Logo";

const PinDot: React.FC<{ filled: boolean }> = ({ filled }) => (
  <div
    style={{
      width: 22,
      height: 22,
      borderRadius: 11,
      background: filled ? COLORS.primaryGlow : "transparent",
      border: `2px solid ${filled ? COLORS.primaryGlow : COLORS.border}`,
      boxShadow: filled ? `0 0 16px ${COLORS.primaryGlow}` : "none",
      transition: "all 0.2s",
    }}
  />
);

const Key: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      width: 90,
      height: 90,
      borderRadius: 50,
      background: COLORS.surfaceAlt,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 32,
      fontWeight: 700,
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
    }}
  >
    {label}
  </div>
);

export const SceneLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });

  // Reveal pin progressively
  const pinFilled = Math.min(4, Math.floor(interpolate(frame, [25, 75], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const success = frame > 80;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 03 — POS Login" title="Open the POS app" subtitle="Available on Android, iPad & Desktop." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.9)`, marginTop: 60 }}>
        <TabletFrame width={1080} height={760}>
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, background: `linear-gradient(180deg, ${COLORS.surface}, ${COLORS.bg})` }}>
            <StokivoLogo size={70} />
            <h3 style={{ color: COLORS.text, fontSize: 32, marginTop: 30, marginBottom: 6, fontWeight: 700 }}>
              {success ? "Welcome back, Adaeze" : "Enter your PIN"}
            </h3>
            <p style={{ color: COLORS.textMuted, fontSize: 16, marginBottom: 36 }}>
              {success ? "Loading register…" : "SNI Foods · Cashier mode"}
            </p>

            {!success ? (
              <>
                <div style={{ display: "flex", gap: 20, marginBottom: 36 }}>
                  {[0, 1, 2, 3].map((i) => <PinDot key={i} filled={i < pinFilled} />)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 90px)", gap: 18 }}>
                  {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                    <Key key={i} label={k} />
                  ))}
                </div>
              </>
            ) : (
              <Sequence from={0}>
                <SuccessCheck />
              </Sequence>
            )}
          </div>
        </TabletFrame>
      </div>
    </AbsoluteFill>
  );
};

const SuccessCheck: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 10 } });
  return (
    <div
      style={{
        width: 140,
        height: 140,
        borderRadius: 70,
        background: `${COLORS.success}22`,
        border: `3px solid ${COLORS.success}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 70,
        color: COLORS.success,
        transform: `scale(${e})`,
        boxShadow: `0 0 60px ${COLORS.success}66`,
      }}
    >
      ✓
    </div>
  );
};

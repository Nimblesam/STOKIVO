import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { COLORS } from "../theme";
import { StokivoLogo } from "../components/Logo";

const Pill: React.FC<{ label: string; i: number }> = ({ label, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 30 - i * 8, fps, config: { damping: 18 } });
  return (
    <div style={{
      opacity: enter,
      transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
      padding: "12px 24px",
      borderRadius: 999,
      background: `${COLORS.primary}33`,
      border: `1px solid ${COLORS.primary}66`,
      color: COLORS.primaryGlow,
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 0.3,
    }}>
      {label}
    </div>
  );
};

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });
  const ctaSpring = spring({ frame: frame - 70, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ opacity: inUp, transform: `scale(${interpolate(inUp, [0, 1], [0.8, 1])})`, marginBottom: 36 }}>
        <StokivoLogo size={130} />
      </div>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
        fontSize: 78,
        fontWeight: 800,
        color: COLORS.text,
        margin: 0,
        letterSpacing: -3,
        lineHeight: 1.05,
        maxWidth: 1400,
      }}>
        Built for <span style={{ color: COLORS.primaryGlow }}>speed</span>.<br />
        Designed for <span style={{ color: COLORS.primaryGlow }}>simplicity</span>.
      </h2>

      <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
        <Pill label="Web · Desktop · Android" i={0} />
        <Pill label="Offline-ready" i={1} />
        <Pill label="14-day free trial" i={2} />
      </div>

      <Sequence from={70}>
        <div style={{
          marginTop: 40,
          padding: "22px 50px",
          background: `linear-gradient(135deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
          borderRadius: 999,
          color: "#fff",
          fontSize: 26,
          fontWeight: 800,
          boxShadow: `0 20px 60px ${COLORS.primary}aa`,
          transform: `scale(${ctaSpring})`,
          letterSpacing: 0.3,
        }}>
          stokivo.com →
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

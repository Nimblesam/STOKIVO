import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { StokivoLogo } from "../components/Logo";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 90 } });
  const taglineIn = spring({ frame: frame - 35, fps, config: { damping: 18 } });
  const subIn = spring({ frame: frame - 55, fps, config: { damping: 18 } });

  const logoScale = interpolate(logoIn, [0, 1], [0.7, 1]);
  const tY = interpolate(taglineIn, [0, 1], [25, 0]);
  const sY = interpolate(subIn, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          opacity: logoIn,
          transform: `scale(${logoScale})`,
          marginBottom: 50,
        }}
      >
        <StokivoLogo size={160} />
      </div>
      <h2
        style={{
          opacity: taglineIn,
          transform: `translateY(${tY}px)`,
          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.text,
          margin: 0,
          letterSpacing: -2.5,
          textAlign: "center",
          maxWidth: 1300,
          lineHeight: 1.05,
        }}
      >
        Stock smarter. <span style={{ color: COLORS.primaryGlow }}>Sell faster.</span>
      </h2>
      <p
        style={{
          opacity: subIn,
          transform: `translateY(${sY}px)`,
          marginTop: 24,
          fontSize: 30,
          color: COLORS.textMuted,
          letterSpacing: 0.5,
        }}
      >
        Simple, fast, modern POS for merchants.
      </p>
    </AbsoluteFill>
  );
};

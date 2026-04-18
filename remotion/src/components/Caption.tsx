import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

export const SceneCaption: React.FC<{
  step: string;
  title: string;
  subtitle?: string;
}> = ({ step, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const y = interpolate(enter, [0, 1], [40, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 70,
        opacity,
        transform: `translateY(${y}px)`,
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "6px 14px",
          background: `${COLORS.primary}33`,
          border: `1px solid ${COLORS.primary}66`,
          borderRadius: 999,
          color: COLORS.primaryGlow,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {step}
      </div>
      <h1
        style={{
          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.text,
          margin: 0,
          letterSpacing: -1.5,
          lineHeight: 1.05,
          maxWidth: 1500,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: 22,
            color: COLORS.textMuted,
            marginTop: 10,
            maxWidth: 1200,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

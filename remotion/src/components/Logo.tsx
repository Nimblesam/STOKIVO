import { COLORS } from "../theme";

export const StokivoLogo: React.FC<{ size?: number; showText?: boolean }> = ({
  size = 80,
  showText = true,
}) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.25 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: `linear-gradient(135deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 10px 40px ${COLORS.primary}99, inset 0 -6px 14px rgba(0,0,0,0.35), inset 0 6px 14px rgba(255,255,255,0.25)`,
          transform: "perspective(400px) rotateX(8deg)",
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            fontWeight: 900,
            fontSize: size * 0.62,
            color: "#fff",
            lineHeight: 1,
            textShadow: "0 4px 12px rgba(0,0,0,0.45)",
            letterSpacing: -2,
          }}
        >
          S
        </span>
      </div>
      {showText && (
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            fontWeight: 800,
            fontSize: size * 0.55,
            color: COLORS.text,
            letterSpacing: -1.5,
          }}
        >
          Stokivo
        </span>
      )}
    </div>
  );
};

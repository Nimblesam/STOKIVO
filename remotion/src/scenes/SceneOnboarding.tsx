import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { COLORS } from "../theme";
import { BrowserFrame } from "../components/DeviceFrame";
import { SceneCaption } from "../components/Caption";
import { StokivoLogo } from "../components/Logo";

const Field: React.FC<{ label: string; value: string; delay: number; typing?: boolean }> = ({
  label,
  value,
  delay,
  typing = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const chars = typing ? Math.floor(interpolate(frame - delay - 6, [0, 22], [0, value.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : value.length;
  return (
    <div style={{ opacity: enter, marginBottom: 20 }}>
      <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div
        style={{
          height: 56,
          background: COLORS.surfaceAlt,
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          fontSize: 20,
          color: COLORS.text,
          fontWeight: 500,
        }}
      >
        {value.slice(0, chars)}
        <span
          style={{
            display: chars < value.length ? "inline-block" : "none",
            width: 2,
            height: 24,
            background: COLORS.primaryGlow,
            marginLeft: 2,
          }}
        />
      </div>
    </div>
  );
};

export const SceneOnboarding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inUp = spring({ frame, fps, config: { damping: 18 } });
  const btnPulse = spring({ frame: frame - 100, fps, config: { damping: 8 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <SceneCaption step="Step 01 — Onboarding" title="Sign up & set up your business" subtitle="Web onboarding takes minutes." />
      <div style={{ opacity: inUp, transform: `translateY(${interpolate(inUp, [0, 1], [40, 0])}px) scale(0.85)`, marginTop: 80 }}>
        <BrowserFrame url="app.stokivo.com/register">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Left brand panel */}
            <div
              style={{
                width: "42%",
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primarySoft})`,
                padding: 50,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <StokivoLogo size={56} />
              <div>
                <h3 style={{ fontSize: 38, color: "#fff", fontWeight: 800, margin: 0, lineHeight: 1.15, letterSpacing: -1 }}>
                  Run your store from anywhere.
                </h3>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, marginTop: 14, lineHeight: 1.5 }}>
                  POS, inventory, invoicing — all in one platform built for modern merchants.
                </p>
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                ★★★★★  Trusted by 10,000+ merchants
              </div>
            </div>
            {/* Right form */}
            <div style={{ flex: 1, padding: 50, background: COLORS.surface }}>
              <h4 style={{ fontSize: 28, color: COLORS.text, margin: "0 0 8px 0", fontWeight: 700 }}>Create your business</h4>
              <p style={{ fontSize: 15, color: COLORS.textMuted, margin: "0 0 32px 0" }}>
                Tell us about your store.
              </p>
              <Field label="Business name" value="SNI Foods Ltd" delay={20} />
              <Field label="Country / Currency" value="United Kingdom · GBP £" delay={45} />
              <Field label="Store address" value="42 High Street, London, UK" delay={70} />
              <Sequence from={100}>
                <button
                  style={{
                    marginTop: 16,
                    width: "100%",
                    height: 56,
                    background: `linear-gradient(135deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                    boxShadow: `0 12px 30px ${COLORS.primary}88`,
                    transform: `scale(${1 + btnPulse * 0.04})`,
                  }}
                >
                  Create my store →
                </button>
              </Sequence>
            </div>
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

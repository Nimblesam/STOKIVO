import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { COLORS } from "./theme";

import { SceneIntro } from "./scenes/SceneIntro";
import { SceneOnboarding } from "./scenes/SceneOnboarding";
import { SceneSetup } from "./scenes/SceneSetup";
import { SceneLogin } from "./scenes/SceneLogin";
import { SceneCheckout } from "./scenes/SceneCheckout";
import { SceneCardPayment } from "./scenes/SceneCardPayment";
import { SceneReceipt } from "./scenes/SceneReceipt";
import { SceneOrders } from "./scenes/SceneOrders";
import { SceneDashboard } from "./scenes/SceneDashboard";
import { SceneOutro } from "./scenes/SceneOutro";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const D = {
  intro: 100,
  onboarding: 130,
  setup: 130,
  login: 100,
  checkout: 150,
  card: 140,
  receipt: 110,
  orders: 110,
  dashboard: 140,
  outro: 110,
};
const T = 18;

// Total frames: sum of scenes minus (transitions * 9)
export const TOTAL_FRAMES =
  Object.values(D).reduce((a, b) => a + b, 0) - T * 9;

const AmbientBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 80) * 30;
  const drift2 = Math.cos(frame / 110) * 40;
  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -300 + drift,
          top: -400 + drift2,
          background:
            "radial-gradient(circle, rgba(110,63,190,0.45) 0%, rgba(110,63,190,0) 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          right: -200 - drift,
          bottom: -300 + drift2,
          background:
            "radial-gradient(circle, rgba(154,107,255,0.35) 0%, rgba(154,107,255,0) 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
    }}
  />
);

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [0, TOTAL_FRAMES], [0, 100], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        height: 4,
        width: `${w}%`,
        background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
        boxShadow: `0 0 20px ${COLORS.primaryGlow}`,
        zIndex: 50,
      }}
    />
  );
};

const t = (frames: number) => linearTiming({ durationInFrames: frames });

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif" }}>
      <AmbientBackdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.intro}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.onboarding}>
          <SceneOnboarding />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.setup}>
          <SceneSetup />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom-right" })} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.login}>
          <SceneLogin />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.checkout}>
          <SceneCheckout />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.card}>
          <SceneCardPayment />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.receipt}>
          <SceneReceipt />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.orders}>
          <SceneOrders />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.dashboard}>
          <SceneDashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(T)} />

        <TransitionSeries.Sequence durationInFrames={D.outro}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Vignette />
      <Progress />
    </AbsoluteFill>
  );
};

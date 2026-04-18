import React from "react";
import { COLORS } from "../theme";

export const BrowserFrame: React.FC<{
  url?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ url = "app.stokivo.com", children, width = 1280, height = 760 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        background: COLORS.surface,
        overflow: "hidden",
        boxShadow:
          "0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          height: 44,
          background: COLORS.surfaceAlt,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#FF5F57" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#FEBC2E" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28C840" }} />
        <div
          style={{
            marginLeft: 24,
            background: "rgba(255,255,255,0.06)",
            color: COLORS.textMuted,
            fontSize: 13,
            padding: "5px 16px",
            borderRadius: 8,
            fontFamily: "monospace",
          }}
        >
          🔒 {url}
        </div>
      </div>
      <div style={{ width: "100%", height: height - 44, position: "relative" }}>
        {children}
      </div>
    </div>
  );
};

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ children, width = 420, height = 860 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 50,
        background: "#0a0a0a",
        padding: 14,
        boxShadow:
          "0 50px 100px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 38,
          background: COLORS.surface,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 28,
            background: "#000",
            borderRadius: 16,
            zIndex: 10,
          }}
        />
        {children}
      </div>
    </div>
  );
};

export const TabletFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ children, width = 1100, height = 760 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 32,
        background: "#0a0a0a",
        padding: 16,
        boxShadow:
          "0 50px 100px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 20,
          background: COLORS.surface,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};

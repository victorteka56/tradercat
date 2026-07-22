import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon — filled square (iOS applies its own mask). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14181f",
          color: "#ffffff",
          fontSize: 118,
          fontWeight: 800,
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}

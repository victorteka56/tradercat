import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

/** Favicon — the "T" mark on the brand ink square. */
export default function Icon() {
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
          fontSize: 160,
          fontWeight: 800,
          borderRadius: 56,
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}

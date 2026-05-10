import { ImageResponse } from "next/og";

// Auto-generated 1200x630 social card. Next.js wires this up at build time
// for any URL that doesn't override `metadata.openGraph.images`.
export const runtime = "nodejs";
export const alt = "Huishtansen Eats — the Huish family recipe collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #047857 0%, #065f46 50%, #022c22 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 200, lineHeight: 1, marginBottom: 24 }}>
          🍳
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -2,
            marginBottom: 16,
          }}
        >
          Huishtansen Eats
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#a7f3d0",
            fontWeight: 500,
            maxWidth: 900,
          }}
        >
          The Huish family recipe collection — plan, cook, and shop together.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

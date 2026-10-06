import { ImageResponse } from "next/og";

export const alt = "SettleSmart — Settle group expenses with fewer transfers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "#f5f7f8",
        color: "#0b1b2e",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#0b1b2e" />
          <path
            d="M8.5 11.5h11a4.5 4.5 0 0 1 0 9H14"
            fill="none"
            stroke="#5eead4"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="m16.5 17-3 3.5 3 3.5"
            fill="none"
            stroke="#5eead4"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" />
        </svg>
        SettleSmart
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-2px",
          }}
        >
          Settle group expenses with fewer transfers.
        </div>
        <div style={{ fontSize: 32, color: "#33415c" }}>
          The minimum number of payments, exact to the cent.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "16px",
          fontSize: 28,
          color: "#0f766e",
          fontWeight: 600,
        }}
      >
        Runs in your browser · No sign-up
      </div>
    </div>,
    size,
  );
}

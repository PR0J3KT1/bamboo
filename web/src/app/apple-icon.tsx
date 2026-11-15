import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/* The barrel on the grove, for an iPhone's home screen. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14291C" }}>
        <svg width="132" height="132" viewBox="0 0 40 40">
          <path d="M11 7.5c-2.2 3.6-3.2 8-3.2 12.5s1 8.9 3.2 12.5h18c2.2-3.6 3.2-8 3.2-12.5S31.2 11.1 29 7.5z" fill="#C9862A" />
          <path d="M9.4 13h21.2M8.2 20h23.6M9.4 27h21.2" stroke="#3A230C" strokeWidth="2.2" />
          <path d="M27.5 4.2c4.6.4 7.2 3.6 7 8-4.4-.5-7-3.5-7-8z" fill="#8DB36A" />
        </svg>
      </div>
    ),
    size,
  );
}

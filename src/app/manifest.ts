import type { MetadataRoute } from "next"

/**
 * Floss as an installed web app: Add to Home Screen on the iPad and iPhone,
 * or Install in desktop Chrome, opens it standalone at Today. Icons come from src/app/icon.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Floss",
    short_name: "Floss",
    description:
      "A dental practice's front desk: chairs, bookings, patients and payments. Synthetic data only.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}

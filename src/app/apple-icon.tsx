import { ImageResponse } from "next/og"

import { BrandTile } from "./icon"

// The iPhone and iPad home-screen icon (iOS rounds the corners itself, so the tile is square)
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(<BrandTile size={180} radius={0} />, size)
}

import { ImageResponse } from "next/og"

import { FLOSS_GLYPH } from "@/components/shared/brand-mark"

// The browser and home-screen icons, drawn from the one glyph (src/components/shared/brand-mark.tsx): 32 for tabs, 192 and
// 512 for the web app manifest (src/app/manifest.ts). The public routes /icon/<size> skip sign-in (src/proxy.ts).
const SIZES = [32, 192, 512] as const

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }))
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id)
  return new ImageResponse(<BrandTile size={size} radius={size * 0.22} />, {
    width: size,
    height: size,
  })
}

/** Near-black tile, white glyph: reads on light and dark tab bars and home screens alike */
export function BrandTile({ size, radius }: { size: number; radius: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#18181b",
        borderRadius: radius,
      }}
    >
      {/* a favicon, never in a page */}
      <svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d={FLOSS_GLYPH} />
      </svg>
    </div>
  )
}

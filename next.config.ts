import type { NextConfig } from "next"

// Checks the environment at build and dev startup: a missing or malformed variable stops with its name
import "./src/lib/env"

/** Sent with every response: no framing, no MIME sniffing, no referrer beyond the origin */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

const nextConfig: NextConfig = {
  // Memoizes components and hooks: no hand-written useMemo/useCallback except for effect dependencies
  reactCompiler: true,
  // Links and router.push are checked against the app's routes at typecheck
  typedRoutes: true,
  experimental: {
    // The React Compiler's native Rust port inside Turbopack, not the Babel transform
    turbopackRustReactCompiler: true,
    // A page prefetched or visited stays in the client cache for a minute, so the nav answers at once; a write
    // revalidates the layout, which drops it
    staleTimes: { dynamic: 60, static: 60 },
  },
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig

import { useMediaQuery } from "@/hooks/use-media-query"

/** Phone width (under 768px); false on the server and during hydration */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)") === true
}

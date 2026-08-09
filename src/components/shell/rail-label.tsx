/**
 * A rail item's name. The desktop rail stays icons with tooltips; the phone's sheet (the only place `data-mobile`
 * is set) has room, so there the names show beside the icons, left-aligned.
 */
export function RailLabel({ children }: { children: React.ReactNode }) {
  return <span className="hidden in-data-[mobile=true]:inline">{children}</span>
}

/** A rail button's alignment: centred on the rail, left-aligned in the phone's sheet */
export const RAIL_BUTTON = "justify-center in-data-[mobile=true]:justify-start"

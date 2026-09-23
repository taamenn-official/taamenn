/**
 * Phase 2 boundary only. Nothing here renders.
 * TAAMEN Free / Pro / sponsored placements stay disabled until a later phase
 * explicitly turns the switch on. Do not mount slots, pixels, or billing from this module.
 */
export const PHASE1_MONETIZATION_ENABLED = false;

export type FuturePlacement =
  | 'AdSlot'
  | 'SponsoredCard'
  | 'SponsoredVenue'
  | 'SponsoredMatch'
  | 'PartnerCard';

export function placementEnabled(_placement: FuturePlacement): boolean {
  return PHASE1_MONETIZATION_ENABLED;
}

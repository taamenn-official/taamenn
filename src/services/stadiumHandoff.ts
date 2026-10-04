export type StadiumPrefill = { stadium: string; city: string };

let pending: StadiumPrefill | null = null;

/** Short-lived handoff. Nothing is stored until the user saves the match. */
export function requestMatchFromStadium(prefill: StadiumPrefill) {
  pending = {
    stadium: prefill.stadium.trim().slice(0, 120),
    city: prefill.city.trim().slice(0, 120),
  };
  window.dispatchEvent(new CustomEvent('taamen-create-match'));
}

export function consumeMatchFromStadium(): StadiumPrefill | null {
  const value = pending;
  pending = null;
  return value && value.stadium ? value : null;
}

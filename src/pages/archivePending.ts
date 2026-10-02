/** Pending results open until the user collapses them in the current visit. */
export function pendingSectionStartsOpen(count: number, dismissed: boolean) {
  return !dismissed && count > 0;
}

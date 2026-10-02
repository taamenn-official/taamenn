export type PushPrefs = {
  matchCreated: boolean;
  matchUpdated: boolean;
  matchApproaching: boolean;
  resultPending: boolean;
  system: boolean;
  remind30: boolean;
  remind10: boolean;
};

export const defaultPushPrefs = (): PushPrefs => ({
  matchCreated: true,
  matchUpdated: true,
  matchApproaching: true,
  resultPending: true,
  system: false,
  remind30: true,
  remind10: true,
});

export type PushJobType = 'created' | 'updated' | 'remind-30' | 'remind-10' | 'result-pending' | 'test';

const MINUTE = 60_000;

export function reminderJobId(matchId: string, type: string, deliverAt: number, subscriptionId: string) {
  return `${matchId}:${type}:${deliverAt}:${subscriptionId}`;
}

export function planReminderFacts(input: {
  matchId: string;
  team1: string;
  team2: string;
  kickoff: number;
  endAt: number;
  status: string;
  event?: 'created' | 'updated' | 'result-pending' | 'sync';
  prefs: PushPrefs;
  now: number;
}) {
  const upcoming = input.status === 'UPCOMING' || input.status === 'ACTIVE';
  const facts: Array<{ matchId: string; team1: string; team2: string; kickoff: number; type: Exclude<PushJobType, 'test'> }> = [];
  const push = (type: Exclude<PushJobType, 'test'>, when: number) => {
    if (when < input.now - MINUTE) return;
    facts.push({ matchId: input.matchId, team1: input.team1, team2: input.team2, kickoff: input.kickoff, type });
  };
  if (input.event === 'created' && input.prefs.matchCreated) push('created', input.now);
  if (input.event === 'updated' && input.prefs.matchUpdated) push('updated', input.now);
  if (input.event === 'result-pending' && input.prefs.resultPending) push('result-pending', input.now);
  if (upcoming && input.prefs.matchApproaching && input.prefs.remind30) push('remind-30', input.kickoff - 30 * MINUTE);
  if (upcoming && input.prefs.matchApproaching && input.prefs.remind10) push('remind-10', input.kickoff - 10 * MINUTE);
  return facts;
}

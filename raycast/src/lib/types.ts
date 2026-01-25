export type BeliefStatus = "untested" | "testing" | "proven" | "disproven";

export interface Bet {
  id: string;
  name: string;
}

export interface Belief {
  id: string;
  belief: string;
  bet_id: string | null;
  status: BeliefStatus;
}

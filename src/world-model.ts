// Shared simulation vocabulary: Y is up; angles are radians.
export const SIZE = 240;
export const CELL = 4;
export const SEED = 213;

export type Vector = { x: number; y: number; z: number };
export type WorldObject = { id: string; type: 'beacon' | 'rock' | 'tower'; position: Vector; orientation: Vector };
export type FlightControls = { forward: number; turn: number; strafe: number; vertical: number };
export type NavigationCommand = { id: number; target: Vector };
export type NavigationBlockage = {
  position: Vector;
  target: Vector;
} & (
  | { reason: 'destination_below_clearance'; constraints: { minimumTargetY: number } }
  | { reason: 'no_progress'; progress: { distanceRemaining: number; secondsWithoutProgress: number } }
);
export type NavigationOutcome = NavigationCommand & {
  blockage?: NavigationBlockage;
  outcome: 'arrived' | 'blocked' | 'failed' | 'cancelled' | 'interrupted';
  reason?: string;
};
export type NavigationStatus = {
  blockage?: NavigationBlockage;
  state: 'idle' | 'moving' | 'arrived' | 'blocked' | 'failed';
  target?: Vector;
  active?: NavigationCommand;
  pending: NavigationCommand[];
  outcomes: NavigationOutcome[];
  route?: {
    id: number;
    commandIds: number[];
    outcomes: NavigationOutcome[];
    completed: number;
    state: 'moving' | NavigationOutcome['outcome'];
  };
  progress?: { distanceRemaining: number; fraction: number };
};

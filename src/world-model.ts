// Shared simulation vocabulary: Y is up; angles are radians.
export const SIZE = 240;
export const CELL = 4;
export const SEED = 213;

export type Vector = { x: number; y: number; z: number };
export type WorldObject = { id: string; type: 'beacon' | 'rock' | 'tower'; position: Vector; orientation: Vector };
export type FlightControls = { forward: number; turn: number; strafe: number; vertical: number };
export type NavigationStatus = { state: 'idle' | 'moving' | 'arrived' | 'blocked'; target?: Vector };

import { ENUM_A, NUM } from "./enums";

// Static, trackable access -> should use the mangled name.
export const direct = ENUM_A;
// Inlinable const used in an inlinable position.
export const sum = NUM + 1;

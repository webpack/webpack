import { touch } from "./side-effect-counter.js";

// Top-level side effect: runs only when the module is actually evaluated.
touch();

export const ENUM_A = "a-value";
export const ENUM_B = "b-value";
export default "default-value";

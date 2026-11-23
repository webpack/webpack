import { early } from "./declarations.js";

// no side effects of its own, but it reads what an init function sets
export const pair = [early, early];

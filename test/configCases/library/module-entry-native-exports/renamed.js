// The sibling script reads globals spelled like two declarations of this body, so
// both are renamed when the entry is inlined beside it.
import "./legacy.js";
import { twice } from "./lib.js";

export { x } from "./store.js";
export const fetch = (url) => `fetched ${url}`;
export const answer = twice();

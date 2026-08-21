// Importing the entry back keeps webpack from inlining it, so the runtime has to
// start it with a call — the statement these cases are about.
import { times } from "./lib.js";

export function helper(a) {
	return times(a, 2);
}

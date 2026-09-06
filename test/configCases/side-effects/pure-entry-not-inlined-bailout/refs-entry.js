// Importing the entry back keeps webpack from inlining it, which is what the
// bailout below reports.
import { value } from "./index.js";

export function helper() {
	return value;
}

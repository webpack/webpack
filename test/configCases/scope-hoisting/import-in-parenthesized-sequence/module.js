import { check, combine } from "./cjs";

// A statement-level sequence expression whose first element is a parenthesized
// assignment: acorn excludes the wrapping parens from that element's range, so
// the ASI check for the following imported call used to see `)` before the `,`
// separator and splice in a stray `;`, producing `expr, ;expr` (invalid JS).
export function run(source) {
	let a, b, out;
	({ a, b } = source), check(a), (out = combine(a, b));
	return out;
}

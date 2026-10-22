import { check, combine } from "./cjs";

// A statement-level sequence expression whose first element is a parenthesized
// assignment: acorn excludes the wrapping parens from that element's range, so the
// ASI check saw `)` before the `,` and spliced in a stray `;`.
export function run(source) {
	let a, b, out;
	({ a, b } = source), check(a), (out = combine(a, b));
	return out;
}

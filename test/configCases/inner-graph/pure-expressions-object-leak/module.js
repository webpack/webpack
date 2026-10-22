import { a, b, c } from "dep";

// A PURE annotation on a preceding property's value must not leak into a later
// property's computed key check. Without the fix `Boolean(b)` reads as pure and
// the whole object is wrongly considered pure.
export const leak = {
	first: /*#__PURE__*/ Boolean(a),
	[Boolean(b)]: c
};

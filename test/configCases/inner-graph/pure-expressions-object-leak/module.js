import { a, b, c } from "dep";

// A PURE annotation attached to a preceding property's value must not leak
// into a later property's computed key check. Without the fix, `Boolean(b)`
// is treated as pure (because the comment before `Boolean(a)` falls into the
// scanned range) and the whole object is wrongly considered pure.
export const leak = {
	first: /*#__PURE__*/ Boolean(a),
	[Boolean(b)]: c
};

import { light as outsideLight } from "outside-context-sef";
import { light as climbLight } from "./climb-nested/esm";

const OUTSIDE_HEAVY = ["HEAVY", "OUTSIDE", "CONTEXT", "SEF"].join("_");
const CLIMB_HEAVY = ["HEAVY", "CLIMB", "PAST", "CONTEXT"].join("_");

/**
 * @param {string} marker
 * @returns {boolean}
 */
function moduleSourceIncludes(marker) {
	return Object.keys(__webpack_modules__).some((id) =>
		String(__webpack_modules__[id]).includes(marker)
	);
}

it("still runs the used exports", () => {
	expect(outsideLight).toBe("light");
	expect(climbLight).toBe("light");
});

it("inherits package-root sideEffects when node_modules lies outside context", () => {
	// context: src/; dependency is ../node_modules (entities-like layout).
	expect(moduleSourceIncludes(OUTSIDE_HEAVY)).toBe(false);
});

it("does not inherit app sideEffects past a local nested package.json", () => {
	// Case-root package.json has sideEffects: false but sits above context;
	// app-local stubs are not climbed (only node_modules stubs are).
	expect(moduleSourceIncludes(CLIMB_HEAVY)).toBe(true);
});

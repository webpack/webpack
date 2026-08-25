import { light } from "symlinked-sef";

const SYMLINKED_HEAVY = ["HEAVY", "SYMLINKED", "WORKSPACE"].join("_");

/**
 * @param {string} marker
 * @returns {boolean}
 */
function moduleSourceIncludes(marker) {
	return Object.keys(__webpack_modules__).some((id) =>
		String(__webpack_modules__[id]).includes(marker)
	);
}

it("still runs the used export", () => {
	expect(light).toBe("light");
});

it("flags every file of a symlinked package alike", () => {
	// The package request arrives through node_modules and its own imports through
	// the real path; reading the resolved file keeps both on one answer.
	expect(moduleSourceIncludes(SYMLINKED_HEAVY)).toBe(true);
});

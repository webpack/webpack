import { FLAG } from "./env.js";

if (FLAG) {
	require("./side.js");
}

it("keeps __webpack_require__ for a dead-branch evaluation-only require", () => {
	const src = Object.keys(__webpack_modules__)
		.map((id) => String(__webpack_modules__[id]))
		.join("\n");
	expect(src).toMatch(/__webpack_require__\s*\(\s*null\s*\/\*\s*dead branch/);
	expect(src).not.toMatch(/(?<![$_a-zA-Z0-9.])require\s*\(\s*null/);
});

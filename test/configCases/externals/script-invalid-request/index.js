const fs = require("fs");

// `var` (not `const`) so the parser cannot fold the branch away and drop the
// externals — they must be code-generated, only never loaded.
var never = false;

it("should build the script externals without loading them", () => {
	if (never) {
		require("valid");
		require("missing-at");
		require("leading-at");
		require("trailing-at");
	}
});

it("should split a script external on its first `@`", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toContain(
		'"https://cdn.example.com/npm/lodash@4.17.19/lodash.min.js"'
	);
	expect(source).toContain('typeof _ !== "undefined"');
});

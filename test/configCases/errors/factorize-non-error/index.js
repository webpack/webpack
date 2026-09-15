// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency — the module must be factorized, only never executed.
var never = false;

it("should report what a factory tap failed with", () => {
	if (never) {
		require("./rejected.js");
	}
});

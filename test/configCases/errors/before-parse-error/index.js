// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency — the modules must be built, only never executed.
var never = false;

it("should report what a beforeParse tap failed with", () => {
	if (never) {
		require("./thrown.js");
		require("./rejected.js");
	}
});

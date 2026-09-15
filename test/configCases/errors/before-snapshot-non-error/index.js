// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency — the module must be built, only never executed.
var never = false;

it("should report what a beforeSnapshot tap failed with", () => {
	if (never) {
		require("./rejected.js");
	}
});

// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency, whose error is what keeps the bundle from being emitted.
var never = false;

it("should not be emitted while the build has errors", () => {
	if (never) {
		require("./missing");
	}
});

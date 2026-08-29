// `var` so the parser cannot fold the branch away and drop the dependency —
// the module must be built, only never executed.
var never = false;

it("should build the failing module without crashing", () => {
	if (never) {
		require("../_images/file.png");
	}
});

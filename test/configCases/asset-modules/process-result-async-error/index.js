// `var` so the parser cannot fold the branch away and drop the dependency —
// the module must be built, only never executed.
var never = false;

it("should build the failing module without crashing", () => {
	if (never) {
		require("../_images/file.png");
	}
});

it("should report what the hook threw as this module's build error", () => {
	expect(() => require("../_images/file.png")).toThrow("re-encoding failed");
});

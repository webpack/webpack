// `var` so the parser cannot fold the branch away and drop the dependency —
// the module must be built, only never executed.
var never = false;

it("should build the failing module without crashing", () => {
	if (never) {
		require("../_images/file.png");
	}
});

it("should keep the stack that says where the value came from", () => {
	// nothing the project owns is on it, so the frames webpack and the hook own
	// are what names the site — written relative, and without their positions
	expect(() => require("../_images/file.png")).toThrow(
		/\n {4}at \.\.\/[^\n:]+NormalModule\.js\n {4}at eval \(eval at create \([^\n:]+HookCodeFactory\.js\), <anonymous>\)$/
	);
});

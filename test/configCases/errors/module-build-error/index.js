// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependencies — the modules must be built, only never executed.
var never = false;

it("should build every failing module without crashing", () => {
	if (never) {
		require("./broken.js?v8");
		require("./broken.js?jsc");
		require("./broken.js?no-name");
		require("./broken.js?hide-stack");
		require("./broken.js?no-stack");
		require("./broken.js?nothing");
		require("./non-buffer.js");
	}
});

it("should throw the build error when the module is executed", () => {
	expect(() => require("./broken.js?jsc")).toThrow(
		"Module build failed (from ./loader.js):\nTypeError: jsc boom"
	);
});

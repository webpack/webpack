// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependencies — the modules must be built, only never executed.
var never = false;

it("should build every failing module without crashing", () => {
	if (never) {
		require("./broken.js");
		require("./broken.json");
		require("./built.js");
	}
});

it("should throw a SyntaxError when a module that failed to parse is executed", () => {
	expect(() => require("./broken.js")).toThrow(SyntaxError);
	expect(() => require("./broken.json")).toThrow(SyntaxError);
});

it("should throw a plain Error for a build failure that is not a parse error", () => {
	expect(() => require("./built.js")).toThrow("loader boom");
	expect(() => require("./built.js")).not.toThrow(SyntaxError);
});

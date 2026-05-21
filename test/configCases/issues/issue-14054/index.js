const utils = require("./utils");
const allUsed = require("./utils-fullref");

it("should run the used CommonJS export", () => {
	expect(utils.foo()).toBe(["USED", "FOO", "MARKER"].join("_"));
});

it("should keep all exports when the require result is read directly", () => {
	// Reading `allUsed` itself (not through a static member) must keep every
	// export reachable — Object.keys is a side-effecting use of the namespace.
	expect(Object.keys(allUsed).sort()).toEqual(["bar", "foo"]);
});

it("should tree-shake unused CommonJS exports when only static members are accessed", () => {
	const fs = require("fs");
	const content = fs.readFileSync(__filename, "utf-8");
	// Build marker strings at runtime so the assertion source itself does not
	// embed the patterns we are about to look up.
	const usedFoo = ["USED", "FOO", "MARKER"].join("_");
	const unusedBar = ["UNUSED", "BAR", "MARKER"].join("_");
	const unusedBaz = ["UNUSED", "BAZ", "MARKER"].join("_");
	const fullrefFoo = ["FULLREF", "FOO", "MARKER"].join("_");
	const fullrefBar = ["FULLREF", "BAR", "MARKER"].join("_");
	expect(content.includes(usedFoo)).toBe(true);
	expect(content.includes(unusedBar)).toBe(false);
	expect(content.includes(unusedBaz)).toBe(false);
	// Counter-test: when the require result is read directly, exports are kept.
	expect(content.includes(fullrefFoo)).toBe(true);
	expect(content.includes(fullrefBar)).toBe(true);
});
